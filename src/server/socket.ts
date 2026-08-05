import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken } from './auth.js';
import { db } from './db.js';
import { TypingStatus } from '../types/index.js';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
  displayName?: string;
}

export function initSocketServer(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    maxHttpBufferSize: 1e8, // 100 MB max payload for audio/images
  });

  // Track connected sockets per userId
  const userSockets = new Map<string, Set<string>>();

  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return next(new Error('Authentication error: Invalid token'));
    }

    socket.userId = decoded.id;
    socket.username = decoded.username;
    socket.displayName = decoded.displayName;
    next();
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;
    console.log(`Socket connected: ${socket.id} (User: ${userId})`);

    // Register user socket
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);

    // Mark online
    db.setUserOnlineStatus(userId, true);
    io.emit('user:presence', { userId, isOnline: true, lastSeen: new Date().toISOString() });

    // Automatically join all user's chat rooms
    const userChats = db.getUserChats(userId);
    for (const chat of userChats) {
      socket.join(`chat:${chat.id}`);
    }

    // Join personal room for targeted events (like calls or direct notifications)
    socket.join(`user:${userId}`);

    // --- Typing Indicators ---
    socket.on('typing:start', ({ chatId }: { chatId: string }) => {
      socket.to(`chat:${chatId}`).emit('typing:update', {
        chatId,
        userId,
        displayName: socket.displayName!,
        isTyping: true,
      } as TypingStatus);
    });

    socket.on('typing:stop', ({ chatId }: { chatId: string }) => {
      socket.to(`chat:${chatId}`).emit('typing:update', {
        chatId,
        userId,
        displayName: socket.displayName!,
        isTyping: false,
      } as TypingStatus);
    });

    // --- Chat Room Management ---
    socket.on('chat:join', ({ chatId }: { chatId: string }) => {
      socket.join(`chat:${chatId}`);
    });

    socket.on('chat:leave', ({ chatId }: { chatId: string }) => {
      socket.leave(`chat:${chatId}`);
    });

    // --- Real-time Messages ---
    socket.on('message:send', async (data: {
      chatId: string;
      content: string;
      type?: 'text' | 'image' | 'file' | 'audio';
      fileData?: { fileUrl?: string; fileName?: string; fileSize?: number };
      replyToId?: string;
    }, callback) => {
      try {
        const message = db.createMessage(
          data.chatId,
          userId,
          data.content,
          data.type || 'text',
          data.fileData,
          data.replyToId
        );

        // Broadcast to room
        io.to(`chat:${data.chatId}`).emit('message:new', message);

        // Send callback response to sender
        if (typeof callback === 'function') {
          callback({ status: 'ok', message });
        }
      } catch (err: any) {
        if (typeof callback === 'function') {
          callback({ status: 'error', error: err.message });
        }
      }
    });

    socket.on('message:edit', ({ messageId, content }: { messageId: string; content: string }) => {
      try {
        const updated = db.editMessage(messageId, userId, content);
        io.to(`chat:${updated.chatId}`).emit('message:updated', updated);
      } catch (err) {
        console.error('Edit error:', err);
      }
    });

    socket.on('message:delete_everyone', ({ messageId }: { messageId: string }) => {
      try {
        const updated = db.deleteMessageForEveryone(messageId, userId);
        io.to(`chat:${updated.chatId}`).emit('message:updated', updated);
      } catch (err) {
        console.error('Delete error:', err);
      }
    });

    socket.on('chat:mark_read', ({ chatId }: { chatId: string }) => {
      db.markChatAsRead(chatId, userId);
      socket.to(`chat:${chatId}`).emit('chat:read', { chatId, userId });
    });

    // --- WebRTC Audio Call Signaling ---
    socket.on('call:initiate', ({ receiverId, chatId }: { receiverId: string; chatId: string }) => {
      const callerUser = db.getUserById(userId);
      const receiverSockets = userSockets.get(receiverId);

      if (!receiverSockets || receiverSockets.size === 0) {
        // Receiver is offline
        db.addCallLog(userId, receiverId, chatId, 'missed', 0);
        socket.emit('call:unavailable', { receiverId, reason: 'offline' });
        return;
      }

      const callId = 'call_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);

      io.to(`user:${receiverId}`).emit('call:incoming', {
        callId,
        callerId: userId,
        callerUser,
        chatId,
      });
    });

    socket.on('call:accept', ({ callId, callerId, sdp }: { callId: string; callerId: string; sdp: any }) => {
      io.to(`user:${callerId}`).emit('call:accepted', {
        callId,
        calleeId: userId,
        sdp,
      });
    });

    socket.on('call:reject', ({ callId, callerId }: { callId: string; callerId: string }) => {
      db.addCallLog(callerId, userId, '', 'rejected', 0);
      io.to(`user:${callerId}`).emit('call:rejected', {
        callId,
        reason: 'rejected',
      });
    });

    socket.on('call:busy', ({ callId, callerId }: { callId: string; callerId: string }) => {
      db.addCallLog(callerId, userId, '', 'busy', 0);
      io.to(`user:${callerId}`).emit('call:busy', {
        callId,
      });
    });

    socket.on('call:offer', ({ targetId, sdp }: { targetId: string; sdp: any }) => {
      io.to(`user:${targetId}`).emit('call:offer', {
        senderId: userId,
        sdp,
      });
    });

    socket.on('call:answer', ({ targetId, sdp }: { targetId: string; sdp: any }) => {
      io.to(`user:${targetId}`).emit('call:answer', {
        senderId: userId,
        sdp,
      });
    });

    socket.on('call:ice-candidate', ({ targetId, candidate }: { targetId: string; candidate: any }) => {
      io.to(`user:${targetId}`).emit('call:ice-candidate', {
        senderId: userId,
        candidate,
      });
    });

    socket.on('call:end', ({ targetId, duration }: { targetId: string; duration?: number }) => {
      if (targetId) {
        db.addCallLog(userId, targetId, '', 'completed', duration || 0);
        io.to(`user:${targetId}`).emit('call:ended', {
          senderId: userId,
        });
      }
    });

    // --- Disconnect Handler ---
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
          db.setUserOnlineStatus(userId, false);
          io.emit('user:presence', { userId, isOnline: false, lastSeen: new Date().toISOString() });
        }
      }
    });
  });

  return io;
}
