import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { User, Chat, ChatMember, Message, CallLog } from '../types/index.js';

interface DBData {
  users: (User & { passwordHash: string })[];
  chats: Chat[];
  members: ChatMember[];
  messages: Message[];
  callLogs: CallLog[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const defaultData: DBData = {
  users: [],
  chats: [],
  members: [],
  messages: [],
  callLogs: [],
};

class Database {
  private data: DBData = defaultData;

  constructor() {
    this.init();
  }

  private init() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } catch (err) {
        console.error('Failed to parse db.json, reinitializing default:', err);
        this.save();
      }
    } else {
      this.save();
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving database:', err);
    }
  }

  // --- User Operations ---
  async createUser(username: string, displayName: string, plainPassword: string): Promise<User> {
    const existing = this.data.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (existing) {
      throw new Error('Username already taken');
    }

    const passwordHash = await bcrypt.hash(plainPassword, 10);
    const id = 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    const newUser = {
      id,
      username: username.trim(),
      displayName: displayName.trim(),
      passwordHash,
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`,
      statusMessage: 'Hey there! I am using SzChat.',
      isOnline: false,
      lastSeen: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    this.data.users.push(newUser);
    this.save();

    const { passwordHash: _, ...publicUser } = newUser;
    return publicUser;
  }

  async authenticateUser(username: string, plainPassword: string): Promise<User> {
    const user = this.data.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) {
      throw new Error('Invalid username or password');
    }

    const isValid = await bcrypt.compare(plainPassword, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid username or password');
    }

    const { passwordHash: _, ...publicUser } = user;
    return publicUser;
  }

  getUserById(id: string): User | null {
    const user = this.data.users.find(u => u.id === id);
    if (!user) return null;
    const { passwordHash: _, ...publicUser } = user;
    return publicUser;
  }

  getAllUsers(): User[] {
    return this.data.users.map(({ passwordHash: _, ...user }) => user);
  }

  searchUsers(query: string, currentUserId: string): User[] {
    const q = query.toLowerCase().trim();
    if (!q) return [];
    return this.data.users
      .filter(u => u.id !== currentUserId && (u.username.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q)))
      .map(({ passwordHash: _, ...user }) => user);
  }

  updateUser(id: string, updates: Partial<{ displayName: string; avatarUrl: string; statusMessage: string }>): User {
    const userIndex = this.data.users.findIndex(u => u.id === id);
    if (userIndex === -1) throw new Error('User not found');

    this.data.users[userIndex] = {
      ...this.data.users[userIndex],
      ...updates,
    };
    this.save();

    const { passwordHash: _, ...publicUser } = this.data.users[userIndex];
    return publicUser;
  }

  setUserOnlineStatus(id: string, isOnline: boolean) {
    const userIndex = this.data.users.findIndex(u => u.id === id);
    if (userIndex !== -1) {
      this.data.users[userIndex].isOnline = isOnline;
      this.data.users[userIndex].lastSeen = new Date().toISOString();
      this.save();
    }
  }

  // --- Chat Operations ---
  getOrCreateDirectChat(userId1: string, userId2: string): Chat {
    // Find existing direct chat between these two users
    const user1Chats = this.data.members.filter(m => m.userId === userId1).map(m => m.chatId);
    const user2Chats = this.data.members.filter(m => m.userId === userId2).map(m => m.chatId);
    const commonChatId = user1Chats.find(cId => user2Chats.includes(cId) && !this.getChatByIdRaw(cId)?.isGroup);

    if (commonChatId) {
      return this.getChatForUser(commonChatId, userId1)!;
    }

    // Create new direct chat
    const chatId = 'chat_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    const now = new Date().toISOString();
    const newChat: Chat = {
      id: chatId,
      isGroup: false,
      createdAt: now,
      updatedAt: now,
      members: [],
    };

    this.data.chats.push(newChat);

    const m1: ChatMember = {
      chatId,
      userId: userId1,
      role: 'member',
      joinedAt: now,
      pinned: false,
      archived: false,
      unreadCount: 0,
    };

    const m2: ChatMember = {
      chatId,
      userId: userId2,
      role: 'member',
      joinedAt: now,
      pinned: false,
      archived: false,
      unreadCount: 0,
    };

    this.data.members.push(m1, m2);
    this.save();

    return this.getChatForUser(chatId, userId1)!;
  }

  createGroupChat(createdBy: string, name: string, description?: string, memberIds: string[] = []): Chat {
    const chatId = 'group_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    const inviteCode = Math.random().toString(36).substring(2, 10);
    const now = new Date().toISOString();

    const newChat: Chat = {
      id: chatId,
      isGroup: true,
      name,
      description: description || '',
      avatarUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`,
      createdBy,
      inviteCode,
      createdAt: now,
      updatedAt: now,
      members: [],
    };

    this.data.chats.push(newChat);

    const allMemberIds = Array.from(new Set([createdBy, ...memberIds]));
    for (const uId of allMemberIds) {
      this.data.members.push({
        chatId,
        userId: uId,
        role: uId === createdBy ? 'admin' : 'member',
        joinedAt: now,
        pinned: false,
        archived: false,
        unreadCount: 0,
      });
    }

    // Add a system welcome message
    const systemMsg: Message = {
      id: 'msg_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
      chatId,
      senderId: createdBy,
      content: `Group "${name}" created.`,
      type: 'system',
      isEdited: false,
      isDeletedForEveryone: false,
      status: 'read',
      createdAt: now,
      updatedAt: now,
    };
    this.data.messages.push(systemMsg);

    this.save();
    return this.getChatForUser(chatId, createdBy)!;
  }

  private getChatByIdRaw(id: string): Chat | undefined {
    return this.data.chats.find(c => c.id === id);
  }

  getChatForUser(chatId: string, userId: string): Chat | null {
    const chat = this.data.chats.find(c => c.id === chatId);
    if (!chat) return null;

    const userMember = this.data.members.find(m => m.chatId === chatId && m.userId === userId);
    if (!userMember) return null;

    const members = this.data.members
      .filter(m => m.chatId === chatId)
      .map(m => ({
        ...m,
        user: this.getUserById(m.userId) || undefined,
      }));

    const lastMessage = [...this.data.messages]
      .filter(msg => msg.chatId === chatId && !msg.deletedForUserIds?.includes(userId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    let name = chat.name;
    let avatarUrl = chat.avatarUrl;

    // For direct chats, name and avatar are the other member's
    if (!chat.isGroup) {
      const otherMember = members.find(m => m.userId !== userId);
      if (otherMember && otherMember.user) {
        name = otherMember.user.displayName;
        avatarUrl = otherMember.user.avatarUrl;
      }
    }

    return {
      ...chat,
      name,
      avatarUrl,
      members,
      lastMessage,
      unreadCount: userMember.unreadCount,
      pinned: userMember.pinned,
      archived: userMember.archived,
      wallpaper: userMember.wallpaper,
    };
  }

  getUserChats(userId: string): Chat[] {
    const userMembers = this.data.members.filter(m => m.userId === userId);
    const chats: Chat[] = [];

    for (const m of userMembers) {
      const chat = this.getChatForUser(m.chatId, userId);
      if (chat) chats.push(chat);
    }

    // Sort by last message time or chat creation time
    return chats.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.createdAt).getTime();
      const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.createdAt).getTime();
      return timeB - timeA;
    });
  }

  updateChatMember(chatId: string, userId: string, updates: Partial<{ pinned: boolean; archived: boolean; wallpaper: string; unreadCount: number; role: 'admin' | 'member' }>) {
    const memberIndex = this.data.members.findIndex(m => m.chatId === chatId && m.userId === userId);
    if (memberIndex !== -1) {
      this.data.members[memberIndex] = {
        ...this.data.members[memberIndex],
        ...updates,
      };
      this.save();
    }
  }

  addMemberToGroup(chatId: string, targetUserId: string, addedBy: string): Chat {
    const chat = this.data.chats.find(c => c.id === chatId && c.isGroup);
    if (!chat) throw new Error('Group chat not found');

    const isMember = this.data.members.some(m => m.chatId === chatId && m.userId === targetUserId);
    if (isMember) return this.getChatForUser(chatId, addedBy)!;

    const now = new Date().toISOString();
    this.data.members.push({
      chatId,
      userId: targetUserId,
      role: 'member',
      joinedAt: now,
      pinned: false,
      archived: false,
      unreadCount: 0,
    });

    const targetUser = this.getUserById(targetUserId);
    const adder = this.getUserById(addedBy);

    // Add system message
    this.data.messages.push({
      id: 'msg_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
      chatId,
      senderId: addedBy,
      content: `${adder?.displayName || 'Someone'} added ${targetUser?.displayName || 'a member'}.`,
      type: 'system',
      isEdited: false,
      isDeletedForEveryone: false,
      status: 'read',
      createdAt: now,
      updatedAt: now,
    });

    this.save();
    return this.getChatForUser(chatId, addedBy)!;
  }

  removeMemberFromGroup(chatId: string, targetUserId: string, removedBy: string): Chat | null {
    const chat = this.data.chats.find(c => c.id === chatId && c.isGroup);
    if (!chat) throw new Error('Group chat not found');

    this.data.members = this.data.members.filter(m => !(m.chatId === chatId && m.userId === targetUserId));

    const targetUser = this.getUserById(targetUserId);
    const remover = this.getUserById(removedBy);
    const now = new Date().toISOString();

    if (targetUserId === removedBy) {
      this.data.messages.push({
        id: 'msg_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
        chatId,
        senderId: targetUserId,
        content: `${targetUser?.displayName || 'A member'} left the group.`,
        type: 'system',
        isEdited: false,
        isDeletedForEveryone: false,
        status: 'read',
        createdAt: now,
        updatedAt: now,
      });
    } else {
      this.data.messages.push({
        id: 'msg_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
        chatId,
        senderId: removedBy,
        content: `${remover?.displayName || 'An admin'} removed ${targetUser?.displayName || 'a member'}.`,
        type: 'system',
        isEdited: false,
        isDeletedForEveryone: false,
        status: 'read',
        createdAt: now,
        updatedAt: now,
      });
    }

    this.save();
    return this.getChatForUser(chatId, removedBy);
  }

  // --- Message Operations ---
  createMessage(
    chatId: string,
    senderId: string,
    content: string,
    type: Message['type'] = 'text',
    fileData?: { fileUrl?: string; fileName?: string; fileSize?: number },
    replyToId?: string
  ): Message {
    const chat = this.data.chats.find(c => c.id === chatId);
    if (!chat) throw new Error('Chat not found');

    const now = new Date().toISOString();
    const messageId = 'msg_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);

    let replyToMessage: Message | undefined;
    if (replyToId) {
      const parent = this.data.messages.find(m => m.id === replyToId);
      if (parent) {
        const sender = this.getUserById(parent.senderId);
        replyToMessage = { ...parent, sender: sender || undefined };
      }
    }

    const newMessage: Message = {
      id: messageId,
      chatId,
      senderId,
      content,
      type,
      fileUrl: fileData?.fileUrl,
      fileName: fileData?.fileName,
      fileSize: fileData?.fileSize,
      replyToId,
      replyTo: replyToMessage,
      isEdited: false,
      isDeletedForEveryone: false,
      deletedForUserIds: [],
      pinned: false,
      status: 'sent',
      createdAt: now,
      updatedAt: now,
    };

    this.data.messages.push(newMessage);
    chat.updatedAt = now;

    // Increment unread count for other members
    for (const m of this.data.members) {
      if (m.chatId === chatId && m.userId !== senderId) {
        m.unreadCount = (m.unreadCount || 0) + 1;
      }
    }

    this.save();

    const sender = this.getUserById(senderId);
    return {
      ...newMessage,
      sender: sender || undefined,
    };
  }

  getChatMessages(chatId: string, userId: string, limit = 50, beforeMessageId?: string): Message[] {
    let chatMsgs = this.data.messages.filter(m => m.chatId === chatId && !m.deletedForUserIds?.includes(userId));

    // Sort chronologically
    chatMsgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    if (beforeMessageId) {
      const idx = chatMsgs.findIndex(m => m.id === beforeMessageId);
      if (idx !== -1) {
        chatMsgs = chatMsgs.slice(0, idx);
      }
    }

    const sliced = chatMsgs.slice(-limit);

    return sliced.map(msg => {
      const sender = this.getUserById(msg.senderId);
      let replyTo = msg.replyTo;
      if (msg.replyToId && !replyTo) {
        const parent = this.data.messages.find(m => m.id === msg.replyToId);
        if (parent) {
          const parentSender = this.getUserById(parent.senderId);
          replyTo = { ...parent, sender: parentSender || undefined };
        }
      }
      return {
        ...msg,
        sender: sender || undefined,
        replyTo,
      };
    });
  }

  searchMessages(chatId: string, query: string, userId: string): Message[] {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    return this.data.messages
      .filter(m => m.chatId === chatId && !m.deletedForUserIds?.includes(userId) && m.content.toLowerCase().includes(q))
      .map(msg => ({
        ...msg,
        sender: this.getUserById(msg.senderId) || undefined,
      }));
  }

  editMessage(messageId: string, senderId: string, newContent: string): Message {
    const msgIndex = this.data.messages.findIndex(m => m.id === messageId);
    if (msgIndex === -1) throw new Error('Message not found');

    const msg = this.data.messages[msgIndex];
    if (msg.senderId !== senderId) throw new Error('Unauthorized');

    msg.content = newContent;
    msg.isEdited = true;
    msg.updatedAt = new Date().toISOString();

    this.save();
    return {
      ...msg,
      sender: this.getUserById(senderId) || undefined,
    };
  }

  deleteMessageForMe(messageId: string, userId: string) {
    const msg = this.data.messages.find(m => m.id === messageId);
    if (msg) {
      if (!msg.deletedForUserIds) msg.deletedForUserIds = [];
      if (!msg.deletedForUserIds.includes(userId)) {
        msg.deletedForUserIds.push(userId);
        this.save();
      }
    }
  }

  deleteMessageForEveryone(messageId: string, senderId: string): Message {
    const msg = this.data.messages.find(m => m.id === messageId);
    if (!msg) throw new Error('Message not found');
    if (msg.senderId !== senderId) throw new Error('Unauthorized');

    msg.content = 'This message was deleted.';
    msg.isDeletedForEveryone = true;
    msg.fileUrl = undefined;
    msg.fileName = undefined;
    msg.updatedAt = new Date().toISOString();

    this.save();
    return {
      ...msg,
      sender: this.getUserById(senderId) || undefined,
    };
  }

  markChatAsRead(chatId: string, userId: string) {
    const member = this.data.members.find(m => m.chatId === chatId && m.userId === userId);
    if (member) {
      member.unreadCount = 0;
      this.save();
    }

    // Update message status to read for messages sent to this chat
    let updated = false;
    for (const msg of this.data.messages) {
      if (msg.chatId === chatId && msg.senderId !== userId && msg.status !== 'read') {
        msg.status = 'read';
        updated = true;
      }
    }
    if (updated) this.save();
  }

  // --- Call Log Operations ---
  addCallLog(callerId: string, receiverId: string, chatId: string, status: CallLog['status'], duration: number = 0): CallLog {
    const log: CallLog = {
      id: 'call_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
      callerId,
      receiverId,
      chatId,
      type: 'audio',
      status,
      duration,
      createdAt: new Date().toISOString(),
    };

    this.data.callLogs.push(log);
    this.save();

    return {
      ...log,
      caller: this.getUserById(callerId) || undefined,
      receiver: this.getUserById(receiverId) || undefined,
    };
  }

  getUserCallLogs(userId: string): CallLog[] {
    return this.data.callLogs
      .filter(l => l.callerId === userId || l.receiverId === userId)
      .map(log => ({
        ...log,
        caller: this.getUserById(log.callerId) || undefined,
        receiver: this.getUserById(log.receiverId) || undefined,
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export const db = new Database();
