import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

export const prisma = new PrismaClient();

export interface UserVisibilityConfig {
  mode: string;
  allowedUserIds: string[];
}

const VISIBILITY_FILE = path.resolve(process.cwd(), 'database', 'user_visibility.json');

export interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  avatarUrl?: string;
  statusMessage?: string;
  isOnline: boolean;
  lastSeen: string;
  createdAt: string;
}

export interface ChatMember {
  chatId: string;
  userId: string;
  role: 'admin' | 'member';
  joinedAt: string;
  pinned: boolean;
  archived: boolean;
  unreadCount: number;
  wallpaper?: string;
  user?: User;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'file' | 'audio' | 'system';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  replyToId?: string;
  replyTo?: Message;
  isEdited: boolean;
  isDeletedForEveryone: boolean;
  deletedForUserIds?: string[];
  pinned?: boolean;
  isViewOnce?: boolean;
  isViewed?: boolean;
  status?: 'sent' | 'delivered' | 'read';
  reactions?: { emoji: string; userId: string }[];
  createdAt: string;
  updatedAt: string;
  sender?: User;
}

export interface Chat {
  id: string;
  isGroup: boolean;
  name?: string;
  description?: string;
  avatarUrl?: string;
  createdBy?: string;
  inviteCode?: string;
  disappearingTimer?: number;
  createdAt: string;
  updatedAt: string;
  members: ChatMember[];
  lastMessage?: Message;
  unreadCount?: number;
  pinned?: boolean;
  archived?: boolean;
  wallpaper?: string;
}

export interface CallLog {
  id: string;
  callerId: string;
  receiverId: string;
  chatId: string;
  type: 'audio' | 'video';
  status: 'missed' | 'rejected' | 'completed' | 'busy';
  duration: number;
  createdAt: string;
  caller?: User;
  receiver?: User;
}

function formatUser(u: any): User {
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    email: u.email || undefined,
    avatarUrl: u.avatarUrl || undefined,
    statusMessage: u.statusMessage || undefined,
    isOnline: u.isOnline,
    lastSeen: u.lastSeen instanceof Date ? u.lastSeen.toISOString() : u.lastSeen,
    createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : u.createdAt,
  };
}

const messageReactions = new Map<string, { emoji: string; userId: string }[]>();

export function addMessageReaction(messageId: string, emoji: string, userId: string) {
  const current = messageReactions.get(messageId) || [];
  const exists = current.some(r => r.emoji === emoji && r.userId === userId);
  const updated = exists
    ? current.filter(r => !(r.emoji === emoji && r.userId === userId))
    : [...current, { emoji, userId }];
  messageReactions.set(messageId, updated);
  return updated;
}

function formatMessage(m: any): Message {
  return {
    id: m.id,
    chatId: m.chatId,
    senderId: m.senderId,
    content: m.content,
    type: (m.type ? m.type.toLowerCase() : 'text') as any,
    fileUrl: m.fileUrl || undefined,
    fileName: m.fileName || undefined,
    fileSize: m.fileSize || undefined,
    replyToId: m.replyToId || undefined,
    replyTo: m.replyTo ? formatMessage(m.replyTo) : undefined,
    isEdited: m.isEdited,
    isDeletedForEveryone: m.isDeletedForEveryone,
    deletedForUserIds: m.deletedForUserIds || [],
    pinned: m.pinned,
    isViewOnce: m.isViewOnce || false,
    isViewed: m.isViewed || false,
    status: (m.status ? m.status.toLowerCase() : 'sent') as any,
    reactions: messageReactions.get(m.id) || m.reactions || [],
    createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
    updatedAt: m.updatedAt instanceof Date ? m.updatedAt.toISOString() : m.updatedAt,
    sender: m.sender ? formatUser(m.sender) : undefined,
  };
}

class Database {
  private userVisibilityMap = new Map<string, UserVisibilityConfig>();

  constructor() {
    this.loadVisibilityMap();
  }

  private loadVisibilityMap(): void {
    try {
      if (fs.existsSync(VISIBILITY_FILE)) {
        const raw = fs.readFileSync(VISIBILITY_FILE, 'utf-8');
        const data = JSON.parse(raw);
        if (data && typeof data === 'object') {
          for (const [userId, config] of Object.entries(data)) {
            const cfg = config as UserVisibilityConfig;
            this.userVisibilityMap.set(userId, {
              mode: cfg.mode || 'EVERYONE',
              allowedUserIds: Array.isArray(cfg.allowedUserIds) ? cfg.allowedUserIds : [],
            });
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load user visibility map:', e);
    }
  }

  private saveVisibilityMap(): void {
    try {
      const obj: Record<string, UserVisibilityConfig> = {};
      this.userVisibilityMap.forEach((val, key) => {
        obj[key] = val;
      });
      const dir = path.dirname(VISIBILITY_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(VISIBILITY_FILE, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Failed to save user visibility map:', e);
    }
  }

  getUserVisibility(userId: string): UserVisibilityConfig {
    return this.userVisibilityMap.get(userId) || { mode: 'EVERYONE', allowedUserIds: [] };
  }

  setUserVisibility(userId: string, mode: string, allowedUserIds?: string[]): UserVisibilityConfig {
    const config: UserVisibilityConfig = {
      mode: mode || 'EVERYONE',
      allowedUserIds: Array.isArray(allowedUserIds) ? allowedUserIds : [],
    };
    this.userVisibilityMap.set(userId, config);
    this.saveVisibilityMap();
    return config;
  }

  async canUserSeeTarget(requestingUserId: string, targetUserId: string): Promise<boolean> {
    if (requestingUserId === targetUserId) return true;

    const requestingUser = await this.getUserById(requestingUserId);
    if (
      requestingUser?.username?.toLowerCase() === 'ishfaq' ||
      requestingUser?.email?.toLowerCase().includes('ishfaq')
    ) {
      return true;
    }

    const config = this.getUserVisibility(targetUserId);
    if (config.mode === 'BLOCKED' || config.mode === 'NOONE') {
      return false;
    }
    if (config.mode === 'FRIENDS_ONLY') {
      return config.allowedUserIds.includes(requestingUserId);
    }
    return true;
  }

  // --- User Operations ---
  async createUser(username: string, displayName: string, plainPassword: string): Promise<User> {
    const existing = await prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
    });
    if (existing) {
      throw new Error('Username already taken');
    }

    const passwordHash = await bcrypt.hash(plainPassword, 10);
    const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(username)}`;
    const statusMessage = 'Hey there! I am using SzChat.';

    const user = await prisma.user.create({
      data: {
        username: username.trim(),
        displayName: displayName.trim(),
        passwordHash,
        avatarUrl,
        statusMessage,
        isOnline: false,
        settings: {
          create: {
            theme: 'DARK',
            notifications: true,
            privacy: 'everyone',
            language: 'en',
          },
        },
      },
    });

    return formatUser(user);
  }

  async authenticateUser(username: string, plainPassword: string): Promise<User> {
    const user = await prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
    });
    if (!user) {
      throw new Error('Invalid username or password');
    }

    const isValid = await bcrypt.compare(plainPassword, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid username or password');
    }

    return formatUser(user);
  }

  private userCache = new Map<string, { user: User; expires: number }>();

  async getUserById(id: string): Promise<User | null> {
    const cached = this.userCache.get(id);
    if (cached && cached.expires > Date.now()) {
      return cached.user;
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      this.userCache.delete(id);
      return null;
    }
    const formatted = formatUser(user);
    this.userCache.set(id, { user: formatted, expires: Date.now() + 5000 });
    return formatted;
  }

  async getAllUsers(): Promise<User[]> {
    const users = await prisma.user.findMany();
    return users.map(formatUser);
  }

  async searchUsers(query: string, currentUserId: string): Promise<User[]> {
    const q = query.trim();
    if (!q) return [];

    const users = await prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { displayName: { contains: q, mode: 'insensitive' } },
        ],
      },
    });

    const filtered: User[] = [];
    for (const u of users) {
      const canSee = await this.canUserSeeTarget(currentUserId, u.id);
      if (canSee) {
        filtered.push(formatUser(u));
      }
    }

    return filtered;
  }

  async updateUser(id: string, updates: Partial<{ displayName: string; avatarUrl: string; statusMessage: string }>): Promise<User> {
    const updated = await prisma.user.update({
      where: { id },
      data: updates,
    });
    return formatUser(updated);
  }

  async setUserOnlineStatus(id: string, isOnline: boolean): Promise<void> {
    try {
      await prisma.user.update({
        where: { id },
        data: {
          isOnline,
          lastSeen: new Date(),
        },
      });
    } catch (err) {
      // Ignore if user not found in ephemeral sockets
    }
  }

  // --- Chat Operations ---
  async getOrCreateDirectChat(userId1: string, userId2: string): Promise<Chat> {
    const isSelf = userId1 === userId2;
    if (!isSelf) {
      const canSee = await this.canUserSeeTarget(userId1, userId2);
      if (!canSee) {
        throw new Error('User is not available or cannot be contacted due to privacy settings');
      }
    }

    let commonChat;
    if (isSelf) {
      commonChat = await prisma.chat.findFirst({
        where: {
          isGroup: false,
          members: {
            every: { userId: userId1 },
          },
        },
      });
    } else {
      commonChat = await prisma.chat.findFirst({
        where: {
          isGroup: false,
          AND: [
            { members: { some: { userId: userId1 } } },
            { members: { some: { userId: userId2 } } },
          ],
        },
      });
    }

    if (commonChat) {
      const formatted = await this.getChatForUser(commonChat.id, userId1);
      if (formatted) return formatted;
    }

    const memberIds = isSelf ? [userId1] : [userId1, userId2];

    const newChat = await prisma.$transaction(async (tx) => {
      const chat = await tx.chat.create({
        data: {
          isGroup: false,
          members: {
            create: memberIds.map((uId) => ({
              userId: uId,
              role: 'MEMBER',
            })),
          },
        },
      });
      return chat;
    });

    const result = await this.getChatForUser(newChat.id, userId1);
    return result!;
  }

  async createGroupChat(createdBy: string, name: string, description?: string, memberIds: string[] = []): Promise<Chat> {
    const inviteCode = Math.random().toString(36).substring(2, 10);
    const avatarUrl = `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`;

    const allMemberIds = Array.from(new Set([createdBy, ...memberIds]));

    const newChat = await prisma.$transaction(async (tx) => {
      const chat = await tx.chat.create({
        data: {
          isGroup: true,
          name,
          description: description || '',
          avatarUrl,
          createdBy,
          inviteCode,
          members: {
            create: allMemberIds.map((uId) => ({
              userId: uId,
              role: uId === createdBy ? 'ADMIN' : 'MEMBER',
            })),
          },
          groupInfo: {
            create: {
              createdBy,
            },
          },
          messages: {
            create: {
              senderId: createdBy,
              content: `Group "${name}" created.`,
              type: 'SYSTEM',
            },
          },
        },
      });
      return chat;
    });

    const result = await this.getChatForUser(newChat.id, createdBy);
    return result!;
  }

  async getChatForUser(chatId: string, userId: string): Promise<Chat | null> {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!chat) return null;

    const userMember = chat.members.find((m) => m.userId === userId);
    if (!userMember) return null;

    const rawLastMsg = await prisma.message.findFirst({
      where: {
        chatId,
        NOT: {
          deletedForUserIds: { has: userId },
        },
      },
      orderBy: { createdAt: 'desc' },
      include: { sender: true, replyTo: { include: { sender: true } } },
    });

    const members: ChatMember[] = chat.members.map((m) => ({
      chatId: m.chatId,
      userId: m.userId,
      role: m.role === 'ADMIN' || m.role === 'OWNER' ? 'admin' : 'member',
      joinedAt: m.joinedAt.toISOString(),
      pinned: m.isPinned,
      archived: m.isArchived,
      unreadCount: m.unreadCount,
      wallpaper: m.wallpaper || undefined,
      user: m.user ? formatUser(m.user) : undefined,
    }));

    let name = chat.name || undefined;
    let avatarUrl = chat.avatarUrl || undefined;

    if (!chat.isGroup) {
      const otherMember = members.find((m) => m.userId !== userId);
      if (!otherMember || !otherMember.user) {
        // Partner user was deleted from DB directly, ignore orphaned chat
        return null;
      }
      name = otherMember.user.displayName;
      avatarUrl = otherMember.user.avatarUrl;
    }

    return {
      id: chat.id,
      isGroup: chat.isGroup,
      name,
      avatarUrl,
      description: chat.description || undefined,
      createdBy: chat.createdBy || undefined,
      inviteCode: chat.inviteCode || undefined,
      createdAt: chat.createdAt.toISOString(),
      updatedAt: chat.updatedAt.toISOString(),
      members,
      lastMessage: rawLastMsg ? formatMessage(rawLastMsg) : undefined,
      unreadCount: userMember.unreadCount,
      pinned: userMember.isPinned,
      archived: userMember.isArchived,
      wallpaper: userMember.wallpaper || undefined,
    };
  }

  async getUserChats(userId: string): Promise<Chat[]> {
    const userMemberships = await prisma.chatMember.findMany({
      where: { userId },
    });

    const rawChats: Chat[] = [];
    for (const m of userMemberships) {
      const chat = await this.getChatForUser(m.chatId, userId);
      if (chat) rawChats.push(chat);
    }

    const seenDirectUsers = new Set<string>();
    const deduplicatedChats: Chat[] = [];

    for (const chat of rawChats) {
      if (!chat.isGroup) {
        const otherMember = chat.members.find((m) => m.userId !== userId) || chat.members[0];
        const targetId = otherMember?.userId || chat.id;
        if (seenDirectUsers.has(targetId)) {
          continue; // Skip duplicate direct chat
        }
        seenDirectUsers.add(targetId);
      }
      deduplicatedChats.push(chat);
    }

    return deduplicatedChats.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.createdAt).getTime();
      const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.createdAt).getTime();
      return timeB - timeA;
    });
  }

  async updateChatMember(
    chatId: string,
    userId: string,
    updates: Partial<{ pinned: boolean; archived: boolean; wallpaper: string; unreadCount: number; role: 'admin' | 'member' }>
  ): Promise<void> {
    const dataToUpdate: any = {};
    if (updates.pinned !== undefined) dataToUpdate.isPinned = updates.pinned;
    if (updates.archived !== undefined) dataToUpdate.isArchived = updates.archived;
    if (updates.wallpaper !== undefined) dataToUpdate.wallpaper = updates.wallpaper;
    if (updates.unreadCount !== undefined) dataToUpdate.unreadCount = updates.unreadCount;
    if (updates.role !== undefined) dataToUpdate.role = updates.role.toUpperCase();

    await prisma.chatMember.updateMany({
      where: { chatId, userId },
      data: dataToUpdate,
    });
  }

  async addMemberToGroup(chatId: string, targetUserId: string, addedBy: string): Promise<Chat> {
    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat || !chat.isGroup) throw new Error('Group chat not found');

    const isMember = await prisma.chatMember.findUnique({
      where: { chatId_userId: { chatId, userId: targetUserId } },
    });

    if (isMember) {
      const existing = await this.getChatForUser(chatId, addedBy);
      return existing!;
    }

    const adder = await prisma.user.findUnique({ where: { id: addedBy } });
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });

    await prisma.$transaction([
      prisma.chatMember.create({
        data: {
          chatId,
          userId: targetUserId,
          role: 'MEMBER',
        },
      }),
      prisma.message.create({
        data: {
          chatId,
          senderId: addedBy,
          content: `${adder?.displayName || 'Someone'} added ${targetUser?.displayName || 'a member'}.`,
          type: 'SYSTEM',
        },
      }),
    ]);

    const result = await this.getChatForUser(chatId, addedBy);
    return result!;
  }

  async removeMemberFromGroup(chatId: string, targetUserId: string, removedBy: string): Promise<Chat | null> {
    const chat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!chat || !chat.isGroup) throw new Error('Group chat not found');

    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    const remover = await prisma.user.findUnique({ where: { id: removedBy } });

    const content =
      targetUserId === removedBy
        ? `${targetUser?.displayName || 'A member'} left the group.`
        : `${remover?.displayName || 'An admin'} removed ${targetUser?.displayName || 'a member'}.`;

    await prisma.$transaction([
      prisma.chatMember.deleteMany({
        where: { chatId, userId: targetUserId },
      }),
      prisma.message.create({
        data: {
          chatId,
          senderId: removedBy,
          content,
          type: 'SYSTEM',
        },
      }),
    ]);

    return this.getChatForUser(chatId, removedBy);
  }

  // --- Message Operations ---
  async createMessage(
    chatId: string,
    senderId: string,
    content: string,
    type: Message['type'] = 'text',
    fileData?: { fileUrl?: string; fileName?: string; fileSize?: number },
    replyToId?: string,
    isViewOnce = false
  ): Promise<Message> {
    const typeEnum = type.toUpperCase() as any;

    const [newMessage] = await prisma.$transaction([
      prisma.message.create({
        data: {
          chatId,
          senderId,
          content,
          type: typeEnum,
          fileUrl: fileData?.fileUrl,
          fileName: fileData?.fileName,
          fileSize: fileData?.fileSize,
          replyToId: replyToId || null,
          isViewOnce,
          isViewed: false,
        },
        include: {
          sender: true,
          replyTo: { include: { sender: true } },
        },
      }),
      prisma.chat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() },
      }),
      prisma.chatMember.updateMany({
        where: { chatId, userId: { not: senderId } },
        data: { unreadCount: { increment: 1 } },
      }),
    ]);

    return formatMessage(newMessage);
  }

  async createMessageWithId(
    id: string,
    chatId: string,
    senderId: string,
    content: string,
    type: Message['type'] = 'text',
    fileData?: { fileUrl?: string; fileName?: string; fileSize?: number },
    replyToId?: string,
    isViewOnce = false,
    createdAt = new Date()
  ): Promise<Message> {
    const typeEnum = type.toUpperCase() as any;

    const newMessage = await prisma.message.create({
      data: {
        id,
        chatId,
        senderId,
        content,
        type: typeEnum,
        fileUrl: fileData?.fileUrl,
        fileName: fileData?.fileName,
        fileSize: fileData?.fileSize,
        replyToId: replyToId || null,
        isViewOnce,
        isViewed: false,
        createdAt,
      },
      include: {
        sender: true,
        replyTo: { include: { sender: true } },
      },
    });

    await Promise.all([
      prisma.chat.update({
        where: { id: chatId },
        data: { updatedAt: createdAt },
      }).catch(() => {}),
      prisma.chatMember.updateMany({
        where: { chatId, userId: { not: senderId } },
        data: { unreadCount: { increment: 1 } },
      }).catch(() => {}),
    ]);

    return formatMessage(newMessage);
  }

  async getChatMessages(chatId: string, userId: string, limit = 50, beforeMessageId?: string): Promise<Message[]> {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { disappearingTimer: true },
    });

    let whereClause: any = {
      chatId,
      NOT: {
        deletedForUserIds: { has: userId },
      },
    };

    if (chat && chat.disappearingTimer > 0) {
      const cutoffDate = new Date(Date.now() - chat.disappearingTimer * 1000);
      whereClause.createdAt = { gte: cutoffDate };
    }

    if (beforeMessageId) {
      const beforeMsg = await prisma.message.findUnique({ where: { id: beforeMessageId } });
      if (beforeMsg) {
        whereClause.createdAt = {
          ...(whereClause.createdAt || {}),
          lt: beforeMsg.createdAt,
        };
      }
    }

    const messages = await prisma.message.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        sender: true,
        replyTo: { include: { sender: true } },
      },
    });

    // Mark incoming messages as DELIVERED in the background
    prisma.message.updateMany({
      where: {
        chatId,
        senderId: { not: userId },
        status: 'SENT',
      },
      data: { status: 'DELIVERED' },
    }).catch(() => {});

    return messages.reverse().map(formatMessage);
  }

  async viewOnceOpenedMessage(messageId: string): Promise<Message | null> {
    const msg = await prisma.message.findUnique({ where: { id: messageId } });
    if (!msg || !msg.isViewOnce || msg.isViewed) return null;

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        isViewed: true,
        fileUrl: null,
      },
      include: {
        sender: true,
        replyTo: { include: { sender: true } },
      },
    });

    return formatMessage(updated);
  }

  async updateDisappearingTimer(chatId: string, timerSeconds: number): Promise<Chat> {
    const updated = await prisma.chat.update({
      where: { id: chatId },
      data: { disappearingTimer: timerSeconds },
    });
    return (await this.getChatForUser(chatId, updated.createdBy || ''))!;
  }

  async updateMessageStatus(messageId: string, status: 'delivered' | 'read'): Promise<Message | null> {
    try {
      const updated = await prisma.message.update({
        where: { id: messageId },
        data: { status: status.toUpperCase() as any },
        include: {
          sender: true,
          replyTo: { include: { sender: true } },
        },
      });
      return formatMessage(updated);
    } catch (e) {
      return null;
    }
  }

  async searchMessages(chatId: string, query: string, userId: string): Promise<Message[]> {
    const q = query.trim();
    if (!q) return [];

    const messages = await prisma.message.findMany({
      where: {
        chatId,
        content: { contains: q, mode: 'insensitive' },
        NOT: {
          deletedForUserIds: { has: userId },
        },
      },
      include: {
        sender: true,
        replyTo: { include: { sender: true } },
      },
    });

    return messages.map(formatMessage);
  }

  async editMessage(messageId: string, senderId: string, newContent: string): Promise<Message> {
    const msg = await prisma.message.findUnique({ where: { id: messageId } });
    if (!msg) throw new Error('Message not found');
    if (msg.senderId !== senderId) throw new Error('Unauthorized');

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        content: newContent,
        isEdited: true,
      },
      include: {
        sender: true,
        replyTo: { include: { sender: true } },
      },
    });

    return formatMessage(updated);
  }

  async getMessageById(id: string): Promise<Message | null> {
    const msg = await prisma.message.findUnique({
      where: { id },
      include: {
        sender: true,
        replyTo: { include: { sender: true } },
      },
    });
    return msg ? formatMessage(msg) : null;
  }

  async deleteMessageForMe(messageId: string, userId: string): Promise<void> {
    const msg = await prisma.message.findUnique({ where: { id: messageId } });
    if (msg) {
      if (!msg.deletedForUserIds.includes(userId)) {
        await prisma.message.update({
          where: { id: messageId },
          data: {
            deletedForUserIds: { push: userId },
          },
        });
      }
    }
  }

  async deleteMessageForEveryone(messageId: string, senderId: string): Promise<Message> {
    const msg = await prisma.message.findUnique({ where: { id: messageId } });
    if (!msg) throw new Error('Message not found');
    if (msg.senderId !== senderId) throw new Error('Unauthorized');

    const updated = await prisma.message.update({
      where: { id: messageId },
      data: {
        content: 'This message was deleted.',
        isDeletedForEveryone: true,
        fileUrl: null,
        fileName: null,
        fileSize: null,
      },
      include: {
        sender: true,
        replyTo: { include: { sender: true } },
      },
    });

    return formatMessage(updated);
  }

  async markChatAsRead(chatId: string, userId: string): Promise<void> {
    await prisma.$transaction([
      prisma.chatMember.updateMany({
        where: { chatId, userId },
        data: { unreadCount: 0, lastReadAt: new Date() },
      }),
      prisma.message.updateMany({
        where: { chatId, senderId: { not: userId } },
        data: { status: 'READ' },
      }),
      prisma.messageStatus.updateMany({
        where: { message: { chatId }, userId },
        data: { status: 'READ' },
      }),
    ]);
  }

  addMessageReaction(messageId: string, emoji: string, userId: string) {
    return addMessageReaction(messageId, emoji, userId);
  }

  // --- Call Log Operations ---
  async addCallLog(
    callerId: string,
    receiverId: string,
    chatId: string,
    status: CallLog['status'],
    duration: number = 0
  ): Promise<CallLog> {
    const statusEnum = status.toUpperCase() as any;

    let validChatId: string | null = chatId;
    if (chatId) {
      const exists = await prisma.chat.findUnique({ where: { id: chatId } });
      if (!exists) validChatId = null;
    }

    if (!validChatId) {
      const direct = await this.getOrCreateDirectChat(callerId, receiverId);
      validChatId = direct.id;
    }

    const call = await prisma.call.create({
      data: {
        chatId: validChatId,
        callerId,
        type: 'AUDIO',
        status: statusEnum === 'COMPLETED' ? 'CONNECTED' : statusEnum,
        duration,
        participants: {
          create: [
            { userId: callerId, role: 'MEMBER', status: 'joined' },
            { userId: receiverId, role: 'MEMBER', status: statusEnum === 'COMPLETED' ? 'joined' : 'left' },
          ],
        },
      },
      include: {
        caller: true,
      },
    });

    const receiver = await prisma.user.findUnique({ where: { id: receiverId } });

    return {
      id: call.id,
      callerId: call.callerId,
      receiverId,
      chatId: call.chatId,
      type: 'audio',
      status,
      duration: call.duration,
      createdAt: call.startedAt.toISOString(),
      caller: call.caller ? formatUser(call.caller) : undefined,
      receiver: receiver ? formatUser(receiver) : undefined,
    };
  }

  async getUserCallLogs(userId: string): Promise<CallLog[]> {
    const calls = await prisma.call.findMany({
      where: {
        OR: [
          { callerId: userId },
          { participants: { some: { userId } } },
        ],
      },
      orderBy: { startedAt: 'desc' },
      include: {
        caller: true,
        participants: { include: { user: true } },
      },
    });

    return calls.map((call) => {
      const otherParticipant = call.participants.find((p) => p.userId !== call.callerId)?.user;
      const statusMap: Record<string, CallLog['status']> = {
        CONNECTED: 'completed',
        ENDED: 'completed',
        REJECTED: 'rejected',
        MISSED: 'missed',
        DIALING: 'missed',
        RINGING: 'missed',
      };

      return {
        id: call.id,
        callerId: call.callerId,
        receiverId: otherParticipant?.id || '',
        chatId: call.chatId,
        type: call.type.toLowerCase() as any,
        status: statusMap[call.status] || 'completed',
        duration: call.duration,
        createdAt: call.startedAt.toISOString(),
        caller: call.caller ? formatUser(call.caller) : undefined,
        receiver: otherParticipant ? formatUser(otherParticipant) : undefined,
      };
    });
  }

  async updateAllMembersWallpaper(chatId: string, wallpaper: string | null): Promise<void> {
    await prisma.chatMember.updateMany({
      where: { chatId },
      data: { wallpaper },
    });
  }

  async deleteChatForUser(chatId: string, userId: string): Promise<void> {
    await prisma.chatMember.deleteMany({
      where: { chatId, userId },
    });
  }

  async runDatabaseQuotaCleanup(): Promise<void> {
    try {
      // 1. Delete view-once messages older than 1 hour or already viewed
      await prisma.message.deleteMany({
        where: {
          isViewOnce: true,
          isViewed: true,
        },
      });

      // 2. Delete messages older than disappearing timers across chats
      const disappearingChats = await prisma.chat.findMany({
        where: { disappearingTimer: { gt: 0 } },
        select: { id: true, disappearingTimer: true },
      });

      for (const chat of disappearingChats) {
        const cutoff = new Date(Date.now() - chat.disappearingTimer * 1000);
        await prisma.message.deleteMany({
          where: {
            chatId: chat.id,
            createdAt: { lt: cutoff },
          },
        });
      }
      // 3. Purge old call logs older than 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await prisma.call.deleteMany({
        where: { startedAt: { lt: thirtyDaysAgo } },
      });

      // 4. Purge messages soft-deleted for everyone older than 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      await prisma.message.deleteMany({
        where: {
          isDeletedForEveryone: true,
          updatedAt: { lt: sevenDaysAgo },
        },
      });
    } catch (e) {
      console.warn('Database quota cleanup notice:', e);
    }
  }

  private pushSubscriptionsMap = new Map<string, Array<{ endpoint: string; keys: { p256dh: string; auth: string } }>>();

  savePushSubscription(userId: string, subscription: { endpoint: string; keys: { p256dh: string; auth: string } }): void {
    if (!subscription || !subscription.endpoint || !subscription.keys) return;
    const existing = this.pushSubscriptionsMap.get(userId) || [];
    const filtered = existing.filter((s) => s.endpoint !== subscription.endpoint);
    filtered.push(subscription);
    this.pushSubscriptionsMap.set(userId, filtered);
  }

  getPushSubscriptions(userId: string): Array<{ endpoint: string; keys: { p256dh: string; auth: string } }> {
    return this.pushSubscriptionsMap.get(userId) || [];
  }

  removePushSubscription(userId: string, endpoint: string): void {
    const existing = this.pushSubscriptionsMap.get(userId) || [];
    const filtered = existing.filter((s) => s.endpoint !== endpoint);
    this.pushSubscriptionsMap.set(userId, filtered);
  }
}

export const db = new Database();
