import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken } from '../middleware/auth.js';
import { db, prisma } from '../db/db.js';

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
  displayName?: string;
}

export function initSocketHandler(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    maxHttpBufferSize: 1e8,
  });

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

  io.on('connection', async (socket: AuthenticatedSocket) => {
    const userId = socket.userId!;

    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);

    await db.setUserOnlineStatus(userId, true);
    io.emit('user:presence', { userId, isOnline: true, lastSeen: new Date().toISOString() });

    const userChats = await db.getUserChats(userId);
    for (const chat of userChats) {
      socket.join(`chat:${chat.id}`);
    }

    socket.join(`user:${userId}`);

    socket.on('typing:start', ({ chatId }: { chatId: string }) => {
      socket.to(`chat:${chatId}`).emit('typing:update', {
        chatId,
        userId,
        displayName: socket.displayName!,
        isTyping: true,
      });
    });

    socket.on('typing:stop', ({ chatId }: { chatId: string }) => {
      socket.to(`chat:${chatId}`).emit('typing:update', {
        chatId,
        userId,
        displayName: socket.displayName!,
        isTyping: false,
      });
    });

    socket.on('chat:join', ({ chatId }: { chatId: string }) => {
      socket.join(`chat:${chatId}`);
    });

    socket.on('chat:leave', ({ chatId }: { chatId: string }) => {
      socket.leave(`chat:${chatId}`);
    });

    socket.on('message:send', async (data: {
      chatId: string;
      content: string;
      type?: 'text' | 'image' | 'file' | 'audio';
      fileData?: { fileUrl?: string; fileName?: string; fileSize?: number };
      replyToId?: string;
      isViewOnce?: boolean;
    }, callback) => {
      try {
        const senderUser = await db.getUserById(userId);
        const now = new Date();
        const nowIso = now.toISOString();

        const instantMessage: any = {
          id: 'msg_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
          chatId: data.chatId,
          senderId: userId,
          sender: senderUser || undefined,
          content: data.content,
          type: data.type || 'text',
          fileUrl: data.fileData?.fileUrl,
          fileName: data.fileData?.fileName,
          fileSize: data.fileData?.fileSize,
          replyToId: data.replyToId,
          isEdited: false,
          isDeletedForEveryone: false,
          isViewOnce: data.isViewOnce || false,
          isViewed: false,
          status: 'sent',
          createdAt: nowIso,
          updatedAt: nowIso,
        };

        // 1. INSTANT real-time WebSocket broadcast to chat room AND direct user rooms (0ms latency!)
        io.to(`chat:${data.chatId}`).emit('message:new', instantMessage);

        db.getChatForUser(data.chatId, userId).then((chat) => {
          if (chat && chat.members) {
            for (const m of chat.members) {
              if (m.userId !== userId) {
                io.to(`user:${m.userId}`).emit('message:new', instantMessage);
              }
            }
          }
        }).catch(() => {});

        if (typeof callback === 'function') {
          callback({ status: 'ok', message: instantMessage });
        }

        // 2. Asynchronous background DB save to PostgreSQL
        db.createMessageWithId(
          instantMessage.id,
          data.chatId,
          userId,
          data.content,
          data.type || 'text',
          data.fileData,
          data.replyToId,
          data.isViewOnce || false,
          now
        ).catch((err) => console.error('Background DB save error:', err));
      } catch (err: any) {
        if (typeof callback === 'function') {
          callback({ status: 'error', error: err.message });
        }
      }
    });

    socket.on('message:delivered', async ({ messageId, chatId }: { messageId: string; chatId: string }) => {
      try {
        const updated = await db.updateMessageStatus(messageId, 'delivered');
        if (updated) {
          io.to(`chat:${chatId}`).emit('message:updated', updated);
        }
      } catch (err) {
        console.error('Delivered error:', err);
      }
    });

    socket.on('message:view_once_opened', async ({ messageId, chatId }: { messageId: string; chatId: string }) => {
      try {
        const updated = await db.viewOnceOpenedMessage(messageId);
        if (updated) {
          io.to(`chat:${chatId}`).emit('message:updated', updated);
        }
      } catch (err) {
        console.error('View once open error:', err);
      }
    });

    socket.on('message:edit', async ({ messageId, content }: { messageId: string; content: string }) => {
      try {
        const updated = await db.editMessage(messageId, userId, content);
        io.to(`chat:${updated.chatId}`).emit('message:updated', updated);
      } catch (err) {
        console.error('Edit error:', err);
      }
    });

    socket.on('message:delete_everyone', async ({ messageId }: { messageId: string }) => {
      try {
        const updated = await db.deleteMessageForEveryone(messageId, userId);
        io.to(`chat:${updated.chatId}`).emit('message:updated', updated);
      } catch (err) {
        console.error('Delete error:', err);
      }
    });

    socket.on('chat:mark_read', async ({ chatId }: { chatId: string }) => {
      try {
        await db.markChatAsRead(chatId, userId);
        await prisma.message.updateMany({
          where: { chatId, senderId: { not: userId } },
          data: { status: 'READ' },
        });
        io.to(`chat:${chatId}`).emit('chat:read', { chatId, userId });
      } catch (err) {
        console.error('Mark read error:', err);
      }
    });

    // WebRTC Signaling
    socket.on('call:initiate', async ({ receiverId, chatId }: { receiverId: string; chatId: string }) => {
      const callerUser = await db.getUserById(userId);
      const receiverSockets = userSockets.get(receiverId);

      if (!receiverSockets || receiverSockets.size === 0) {
        await db.addCallLog(userId, receiverId, chatId, 'missed', 0);
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

    socket.on('call:reject', async ({ callId, callerId }: { callId: string; callerId: string }) => {
      await db.addCallLog(callerId, userId, '', 'rejected', 0);
      io.to(`user:${callerId}`).emit('call:rejected', {
        callId,
        reason: 'rejected',
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

    socket.on('call:end', async ({ targetId, duration }: { targetId: string; duration?: number }) => {
      if (targetId) {
        await db.addCallLog(userId, targetId, '', 'completed', duration || 0);
        io.to(`user:${targetId}`).emit('call:ended', {
          senderId: userId,
        });
      }
    });

    socket.on('disconnect', async () => {
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
          await db.setUserOnlineStatus(userId, false);
          io.emit('user:presence', { userId, isOnline: false, lastSeen: new Date().toISOString() });
        }
      }
    });
  });

  return io;
}
