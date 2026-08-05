import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext.js';
import { useCall } from '../../context/CallContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { Avatar } from '../common/Avatar.js';
import { Phone, Search, Info, ArrowLeft, MoreVertical, Pin, Wallpaper, Clock, BellOff, Trash2 } from 'lucide-react';

interface ChatHeaderProps {
  onBackMobile: () => void;
  onOpenGroupInfo: () => void;
  onToggleSearchInChat: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  onBackMobile,
  onOpenGroupInfo,
  onToggleSearchInChat,
}) => {
  const { activeChat, typingUsers, togglePinChat, setWallpaper, setDisappearingTimer } = useChat();
  const { startCall } = useCall();
  const { user } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  if (!activeChat) return null;

  // Compute recipient details for 1-on-1 chat
  let peerUser: any = null;
  let isOnline = false;
  let lastSeenStr = '';

  if (!activeChat.isGroup) {
    const member = activeChat.members?.find((m: any) => m.userId !== user?.id);
    if (member && member.user) {
      peerUser = member.user;
      isOnline = peerUser.isOnline;
      if (peerUser.lastSeen) {
        lastSeenStr = `last seen ${new Date(peerUser.lastSeen).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}`;
      }
    }
  }

  // Handle Audio Call Trigger
  const handleCall = () => {
    if (activeChat.isGroup) {
      alert('Group audio call started');
      return;
    }
    if (peerUser) {
      startCall(peerUser, activeChat.id);
    }
  };

  const isTyping = typingUsers.length > 0;
  const typingText = typingUsers.map(u => u.displayName).join(', ') + ' typing...';

  return (
    <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-2.5 sm:px-4 py-2.5 flex items-center justify-between shadow-sm z-30 relative w-full max-w-full">
      <div className="flex items-center space-x-1.5 sm:space-x-3 min-w-0 flex-1 pr-1">
        <button
          onClick={onBackMobile}
          className="md:hidden p-1 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div
          className="flex items-center space-x-2 sm:space-x-3 cursor-pointer min-w-0 flex-1 group"
          onClick={onOpenGroupInfo}
        >
          <Avatar
            src={activeChat.avatarUrl}
            name={activeChat.name || 'Chat'}
            isOnline={!activeChat.isGroup ? isOnline : undefined}
            size="md"
            className="flex-shrink-0"
          />

          <div className="min-w-0 flex-1">
            <h2 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors flex items-center space-x-1">
              <span>{activeChat.name || 'Chat'}</span>
              {isMuted && <BellOff className="w-3 h-3 text-zinc-400 inline ml-1" />}
            </h2>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
              {isTyping ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium animate-pulse">
                  {typingText}
                </span>
              ) : activeChat.isGroup ? (
                `${activeChat.members?.length || 0} members`
              ) : isOnline ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Online</span>
              ) : (
                lastSeenStr || 'Offline'
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-0.5 sm:space-x-1 flex-shrink-0 relative">
        <button
          onClick={handleCall}
          className="p-1.5 sm:p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
          title="Start Audio Call"
        >
          <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        <button
          onClick={onToggleSearchInChat}
          className="p-1.5 sm:p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors hidden sm:block"
          title="Search messages"
        >
          <Search className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        <button
          onClick={onOpenGroupInfo}
          className="p-1.5 sm:p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
          title="Contact / Group Info"
        >
          <Info className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-1.5 sm:p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
          title="Chat Options"
        >
          <MoreVertical className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {showMenu && (
          <div className="absolute right-0 top-12 w-52 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl py-1.5 z-50 text-xs font-medium space-y-0.5">
            <button
              onClick={() => {
                onOpenGroupInfo();
                setShowMenu(false);
              }}
              className="w-full px-3.5 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center space-x-2.5 text-zinc-700 dark:text-zinc-300"
            >
              <Info className="w-4 h-4 text-emerald-500" />
              <span>Contact / Group Info</span>
            </button>

            <button
              onClick={() => {
                onToggleSearchInChat();
                setShowMenu(false);
              }}
              className="w-full px-3.5 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center space-x-2.5 text-zinc-700 dark:text-zinc-300"
            >
              <Search className="w-4 h-4 text-emerald-500" />
              <span>Search in Chat</span>
            </button>

            <button
              onClick={() => {
                togglePinChat(activeChat.id);
                setShowMenu(false);
              }}
              className="w-full px-3.5 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center space-x-2.5 text-zinc-700 dark:text-zinc-300"
            >
              <Pin className="w-4 h-4 text-emerald-500" />
              <span>{activeChat.pinned ? 'Unpin Chat' : 'Pin Chat'}</span>
            </button>

            <button
              onClick={() => {
                setIsMuted(!isMuted);
                setShowMenu(false);
              }}
              className="w-full px-3.5 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center space-x-2.5 text-zinc-700 dark:text-zinc-300"
            >
              <BellOff className="w-4 h-4 text-emerald-500" />
              <span>{isMuted ? 'Unmute Notifications' : 'Mute Notifications'}</span>
            </button>

            <button
              onClick={() => {
                const choice = prompt('Disappearing Messages (seconds):\n0 = Off\n86400 = 24 Hours\n604800 = 7 Days', activeChat.disappearingTimer?.toString() || '0');
                if (choice !== null) {
                  setDisappearingTimer(activeChat.id, parseInt(choice) || 0);
                }
                setShowMenu(false);
              }}
              className="w-full px-3.5 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center space-x-2.5 text-zinc-700 dark:text-zinc-300"
            >
              <Clock className="w-4 h-4 text-emerald-500" />
              <span>Disappearing Messages</span>
            </button>

            <button
              onClick={() => {
                const wall = prompt('Enter image URL or Hex color (e.g. #0f172a) for chat wallpaper:');
                if (wall !== null) setWallpaper(activeChat.id, wall);
                setShowMenu(false);
              }}
              className="w-full px-3.5 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center space-x-2.5 text-zinc-700 dark:text-zinc-300"
            >
              <Wallpaper className="w-4 h-4 text-emerald-500" />
              <span>Change Wallpaper</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
