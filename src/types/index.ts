export type UserRole = 'admin' | 'member';

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  statusMessage?: string;
  isOnline: boolean;
  lastSeen: string;
  createdAt: string;
}

export interface ChatMember {
  chatId: string;
  userId: string;
  role: UserRole;
  joinedAt: string;
  pinned: boolean;
  archived: boolean;
  wallpaper?: string;
  unreadCount: number;
  user?: User;
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

export type MessageType = 'text' | 'image' | 'file' | 'audio' | 'system';

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  sender?: User;
  content: string;
  type: MessageType;
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
  status: 'sent' | 'delivered' | 'read';
  reactions?: { emoji: string; userId: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface TypingStatus {
  chatId: string;
  userId: string;
  displayName: string;
  isTyping: boolean;
}

export type CallStatus = 'dialing' | 'incoming' | 'connected' | 'ended' | 'rejected' | 'busy';

export interface CallState {
  callId: string | null;
  chatId: string | null;
  peerId: string | null;
  peerUser: User | null;
  isCaller: boolean;
  status: CallStatus | null;
  startTime: number | null;
  duration: number;
  isMuted: boolean;
  isSpeakerOn: boolean;
  isMinimized?: boolean;
}

export interface CallLog {
  id: string;
  callerId: string;
  receiverId: string;
  chatId: string;
  caller?: User;
  receiver?: User;
  type: 'audio';
  status: 'completed' | 'missed' | 'rejected' | 'busy';
  duration: number;
  createdAt: string;
}
