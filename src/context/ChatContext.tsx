import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Chat, Message, TypingStatus, MessageType } from '../types/index.js';
import { useAuth } from './AuthContext.js';
import { getSocket } from '../lib/socketClient.js';
import { indexedDBService } from '../lib/indexedDB.js';
import { soundEffects } from '../lib/sound.js';

const deduplicateMessages = (msgs: Message[]): Message[] => {
  const seen = new Set<string>();
  const result: Message[] = [];
  for (const m of msgs) {
    if (!seen.has(m.id)) {
      seen.add(m.id);
      result.push(m);
    }
  }
  return result;
};

interface ChatContextType {
  chats: Chat[];
  activeChat: Chat | null;
  activeChatId: string | null;
  messages: Message[];
  typingUsers: TypingStatus[];
  searchQuery: string;
  isSearching: boolean;
  activeTab: 'chats' | 'archived' | 'calls';
  setActiveTab: (tab: 'chats' | 'archived' | 'calls') => void;
  setSearchQuery: (q: string) => void;
  selectChat: (chatId: string | null) => void;
  sendMessage: (
    content: string,
    type?: MessageType,
    fileData?: { fileUrl?: string; fileName?: string; fileSize?: number },
    replyToId?: string,
    isViewOnce?: boolean
  ) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessageForMe: (messageId: string) => Promise<void>;
  deleteMessageForEveryone: (messageId: string) => Promise<void>;
  openViewOnceMedia: (messageId: string) => void;
  reactToMessage: (messageId: string, emoji: string) => void;
  sendTyping: (isTyping: boolean) => void;
  startDirectChat: (targetUserId: string) => Promise<Chat>;
  createGroup: (name: string, description: string, memberIds: string[]) => Promise<Chat>;
  togglePinChat: (chatId: string) => Promise<void>;
  toggleArchiveChat: (chatId: string) => Promise<void>;
  setWallpaper: (chatId: string, wallpaper: string) => Promise<void>;
  setDisappearingTimer: (chatId: string, timerSeconds: number) => Promise<void>;
  addGroupMember: (chatId: string, userId: string) => Promise<void>;
  removeGroupMember: (chatId: string, userId: string) => Promise<void>;
  leaveGroupChat: (chatId: string) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  refreshChats: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingMap, setTypingMap] = useState<Record<string, TypingStatus[]>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'chats' | 'archived' | 'calls'>('chats');
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const activeChatIdRef = useRef<string | null>(activeChatId);
  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  const activeChat = chats.find(c => c.id === activeChatId) || null;

  // Load chats from API & IndexedDB
  const refreshChats = useCallback(async () => {
    if (!token) return;
    try {
      const cached = await indexedDBService.getCachedChats();
      if (cached.length > 0 && chats.length === 0) {
        setChats(cached);
      }

      const res = await fetch('/api/chats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setChats(data.chats);
        indexedDBService.cacheChats(data.chats);
      }
    } catch (err) {
      console.error('Error fetching chats:', err);
    }
  }, [token]);

  useEffect(() => {
    refreshChats();
  }, [refreshChats]);

  // Load messages when activeChatId changes
  useEffect(() => {
    if (!activeChatId || !token) {
      setMessages([]);
      return;
    }

    async function loadMessages() {
      const cachedMsgs = await indexedDBService.getCachedMessages(activeChatId!);
      if (cachedMsgs.length > 0) {
        setMessages(cachedMsgs);
      }

      try {
        const res = await fetch(`/api/chats/${activeChatId}/messages?limit=50`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages);
          indexedDBService.cacheMessages(activeChatId!, data.messages);

          // Mark chat as read locally and on server
          setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, unreadCount: 0 } : c));

          fetch(`/api/chats/${activeChatId}/read`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });

          const socket = getSocket(token);
          socket?.emit('chat:join', { chatId: activeChatId });
          socket?.emit('chat:mark_read', { chatId: activeChatId });
        }
      } catch (err) {
        console.error('Error loading messages:', err);
      }
    }

    loadMessages();
  }, [activeChatId, token]);

  // Persistent Socket Event Listeners
  useEffect(() => {
    if (!token || !user) return;
    const socket = getSocket(token);
    if (!socket) return;

    const handleNewMessage = (msg: Message) => {
      const currentActiveId = activeChatIdRef.current;

      // Emit delivery receipt if recipient received message
      if (msg.senderId !== user.id) {
        socket.emit('message:delivered', { messageId: msg.id, chatId: msg.chatId });
      }

      // Update active message thread if recipient is viewing this chat
      if (msg.chatId === currentActiveId) {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;

          // Replace temp message from same sender if matching
          const tempIdx = prev.findIndex(
            m => m.id.startsWith('temp_') && m.senderId === msg.senderId && m.content === msg.content
          );
          if (tempIdx !== -1) {
            const copy = [...prev];
            copy[tempIdx] = msg;
            return copy;
          }

          return [...prev, msg];
        });

        // Mark read immediately
        fetch(`/api/chats/${msg.chatId}/read`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      // Play sound and send delivery receipt
      if (msg.senderId !== user.id) {
        soundEffects.playMessageReceived();
        const socket = getSocket(token);
        socket?.emit('message:delivered', { messageId: msg.id, chatId: msg.chatId });
      } else {
        soundEffects.playMessageSent();
      }

      // Update chats list in memory without triggering network HTTP GET
      setChats(prev => {
        const chatExists = prev.some(c => c.id === msg.chatId);
        if (!chatExists) {
          refreshChats();
          return prev;
        }

        return prev.map(c => {
          if (c.id === msg.chatId) {
            const isCurrentActive = c.id === currentActiveId;
            const newUnread = isCurrentActive || msg.senderId === user.id ? 0 : (c.unreadCount || 0) + 1;
            return {
              ...c,
              lastMessage: msg,
              updatedAt: msg.createdAt,
              unreadCount: newUnread,
            };
          }
          return c;
        }).sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          const timeA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : new Date(a.createdAt).getTime();
          const timeB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : new Date(b.createdAt).getTime();
          return timeB - timeA;
        });
      });
    };

    const handleMessageUpdated = (updatedMsg: Message) => {
      const normMsg: Message = {
        ...updatedMsg,
        status: (updatedMsg.status || 'sent').toLowerCase() as any,
      };
      setMessages(prev => prev.map(m => m.id === normMsg.id ? normMsg : m));
      setChats(prev => prev.map(c => {
        if (c.id === normMsg.chatId && c.lastMessage?.id === normMsg.id) {
          return { ...c, lastMessage: normMsg };
        }
        return c;
      }));
    };

    const handleTypingUpdate = (status: TypingStatus) => {
      setTypingMap(prev => {
        const list = prev[status.chatId] || [];
        const filtered = list.filter(t => t.userId !== status.userId);
        if (status.isTyping) {
          filtered.push(status);
        }
        return { ...prev, [status.chatId]: filtered };
      });
    };

    const handleChatRead = ({ chatId }: { chatId: string; userId: string }) => {
      setMessages(prev =>
        prev.map(m => (m.chatId === chatId ? { ...m, status: 'read' } : m))
      );
      setChats(prev =>
        prev.map(c => {
          if (c.id === chatId && c.lastMessage) {
            return { ...c, lastMessage: { ...c.lastMessage, status: 'read' } };
          }
          return c;
        })
      );
    };

    const handleMessageReaction = ({ messageId, emoji, userId: rxUserId }: { messageId: string; chatId: string; emoji: string; userId: string }) => {
      if (user && rxUserId === user.id) return;

      setMessages(prev =>
        prev.map(m => {
          if (m.id === messageId) {
            const current = m.reactions || [];
            const exists = current.some(r => r.emoji === emoji && r.userId === rxUserId);
            const updated = exists
              ? current.filter(r => !(r.emoji === emoji && r.userId === rxUserId))
              : [...current, { emoji, userId: rxUserId }];
            return { ...m, reactions: updated };
          }
          return m;
        })
      );
    };

    const handleUserPresence = ({ userId: targetUserId, isOnline, lastSeen }: { userId: string; isOnline: boolean; lastSeen: string }) => {
      setChats(prev =>
        prev.map(c => ({
          ...c,
          members: c.members.map(m => {
            if (m.userId === targetUserId && m.user) {
              return {
                ...m,
                user: {
                  ...m.user,
                  isOnline,
                  lastSeen,
                },
              };
            }
            return m;
          }),
        }))
      );
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:updated', handleMessageUpdated);
    socket.on('typing:update', handleTypingUpdate);
    socket.on('chat:read', handleChatRead);
    socket.on('message:reaction', handleMessageReaction);
    socket.on('user:presence', handleUserPresence);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:updated', handleMessageUpdated);
      socket.off('typing:update', handleTypingUpdate);
      socket.off('chat:read', handleChatRead);
      socket.off('message:reaction', handleMessageReaction);
      socket.off('user:presence', handleUserPresence);
    };
  }, [token, user, refreshChats]);

  const selectChat = (chatId: string | null) => {
    setActiveChatId(chatId);
  };

  const sendMessage = async (
    content: string,
    type: MessageType = 'text',
    fileData?: { fileUrl?: string; fileName?: string; fileSize?: number },
    replyToId?: string,
    isViewOnce = false
  ) => {
    if (!activeChatId || !token || !user) return;

    const tempId = 'temp_' + Date.now();
    const optimisticMsg: Message = {
      id: tempId,
      chatId: activeChatId,
      senderId: user.id,
      sender: user,
      content,
      type,
      fileUrl: fileData?.fileUrl,
      fileName: fileData?.fileName,
      fileSize: fileData?.fileSize,
      replyToId,
      isEdited: false,
      isDeletedForEveryone: false,
      isViewOnce,
      isViewed: false,
      status: 'sent',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, optimisticMsg]);
    soundEffects.playMessageSent();

    const socket = getSocket(token);
    if (socket) {
      socket.emit(
        'message:send',
        { chatId: activeChatId, content, type, fileData, replyToId, isViewOnce },
        (res: any) => {
          if (res && res.status === 'ok' && res.message) {
            setMessages(prev => {
              const alreadyHasReal = prev.some(m => m.id === res.message.id);
              if (alreadyHasReal) {
                return prev.filter(m => m.id !== tempId);
              }
              return prev.map(m => (m.id === tempId ? res.message : m));
            });

            // Update chat lastMessage locally
            setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, lastMessage: res.message, updatedAt: res.message.createdAt } : c));
          }
        }
      );
    }
  };

  const editMessage = async (messageId: string, content: string) => {
    if (!token) return;
    const socket = getSocket(token);
    socket?.emit('message:edit', { messageId, content });
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content, isEdited: true } : m));
  };

  const deleteMessageForMe = async (messageId: string) => {
    if (!token) return;
    await fetch(`/api/messages/${messageId}/delete-me`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    setMessages(prev => prev.filter(m => m.id !== messageId));
  };

  const deleteMessageForEveryone = async (messageId: string) => {
    if (!token) return;
    const socket = getSocket(token);
    socket?.emit('message:delete_everyone', { messageId });

    setMessages(prev =>
      prev.map(m =>
        m.id === messageId
          ? { ...m, content: 'This message was deleted.', isDeletedForEveryone: true, fileUrl: undefined }
          : m
      )
    );
  };

  const openViewOnceMedia = (messageId: string) => {
    if (!token || !activeChatId) return;
    const socket = getSocket(token);
    socket?.emit('message:view_once_opened', { messageId, chatId: activeChatId });
    setMessages(prev =>
      prev.map(m => (m.id === messageId ? { ...m, isViewed: true, fileUrl: undefined } : m))
    );
  };

  const reactToMessage = (messageId: string, emoji: string) => {
    if (!token || !activeChatId || !user) return;
    setMessages(prev =>
      prev.map(m => {
        if (m.id === messageId) {
          const current = m.reactions || [];
          const exists = current.some(r => r.emoji === emoji && r.userId === user.id);
          const updated = exists
            ? current.filter(r => !(r.emoji === emoji && r.userId === user.id))
            : [...current, { emoji, userId: user.id }];
          return { ...m, reactions: updated };
        }
        return m;
      })
    );
    const socket = getSocket(token);
    socket?.emit('message:react', { messageId, chatId: activeChatId, emoji });
  };

  const sendTyping = (isTyping: boolean) => {
    if (!activeChatId || !token) return;
    const socket = getSocket(token);

    if (isTyping) {
      socket?.emit('typing:start', { chatId: activeChatId });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket?.emit('typing:stop', { chatId: activeChatId });
      }, 3000);
    } else {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      socket?.emit('typing:stop', { chatId: activeChatId });
    }
  };

  const startDirectChat = async (targetUserId: string): Promise<Chat> => {
    if (!token) throw new Error('Not authenticated');
    const res = await fetch('/api/chats/direct', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ targetUserId }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to start chat');

    await refreshChats();
    setActiveChatId(data.chat.id);
    return data.chat;
  };

  const createGroup = async (name: string, description: string, memberIds: string[]): Promise<Chat> => {
    if (!token) throw new Error('Not authenticated');
    const res = await fetch('/api/chats/group', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, description, memberIds }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create group');

    await refreshChats();
    setActiveChatId(data.chat.id);
    return data.chat;
  };

  const togglePinChat = async (chatId: string) => {
    if (!token) return;
    const targetChat = chats.find(c => c.id === chatId);
    const pinned = !targetChat?.pinned;

    setChats(prev => prev.map(c => c.id === chatId ? { ...c, pinned } : c));

    await fetch(`/api/chats/${chatId}/pin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ pinned }),
    });
  };

  const toggleArchiveChat = async (chatId: string) => {
    if (!token) return;
    const targetChat = chats.find(c => c.id === chatId);
    const archived = !targetChat?.archived;

    setChats(prev => prev.map(c => c.id === chatId ? { ...c, archived } : c));

    await fetch(`/api/chats/${chatId}/archive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ archived }),
    });
  };

  const setWallpaper = async (chatId: string, wallpaper: string) => {
    if (!token) return;
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, wallpaper } : c));

    await fetch(`/api/chats/${chatId}/wallpaper`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ wallpaper }),
    });
  };

  const setDisappearingTimer = async (chatId: string, timerSeconds: number) => {
    if (!token) return;
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, disappearingTimer: timerSeconds } : c));

    await fetch(`/api/chats/${chatId}/disappearing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ timerSeconds }),
    });
  };

  const addGroupMember = async (chatId: string, userId: string) => {
    if (!token) return;
    const res = await fetch(`/api/chats/${chatId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) refreshChats();
  };

  const removeGroupMember = async (chatId: string, userId: string) => {
    if (!token) return;
    const res = await fetch(`/api/chats/${chatId}/members/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) refreshChats();
  };

  const leaveGroupChat = async (chatId: string) => {
    if (!token) return;
    const res = await fetch(`/api/chats/${chatId}/leave`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      if (activeChatId === chatId) setActiveChatId(null);
      refreshChats();
    }
  };

  const loadMoreMessages = async () => {
    if (!activeChatId || !token || messages.length === 0) return;
    const oldestMessageId = messages[0].id;

    try {
      const res = await fetch(`/api/chats/${activeChatId}/messages?limit=50&before=${oldestMessageId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.messages.length > 0) {
          setMessages(prev => deduplicateMessages([...data.messages, ...prev]));
        }
      }
    } catch (err) {
      console.error('Error loading older messages:', err);
    }
  };

  const activeTypingUsers = activeChatId ? typingMap[activeChatId] || [] : [];

  return (
    <ChatContext.Provider
      value={{
        chats,
        activeChat,
        activeChatId,
        messages,
        typingUsers: activeTypingUsers,
        searchQuery,
        isSearching: !!searchQuery,
        activeTab,
        setActiveTab,
        setSearchQuery,
        selectChat,
        sendMessage,
        editMessage,
        deleteMessageForMe,
        deleteMessageForEveryone,
        openViewOnceMedia,
        reactToMessage,
        sendTyping,
        startDirectChat,
        createGroup,
        togglePinChat,
        toggleArchiveChat,
        setWallpaper,
        setDisappearingTimer,
        addGroupMember,
        removeGroupMember,
        leaveGroupChat,
        loadMoreMessages,
        refreshChats,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within ChatProvider');
  return context;
};
