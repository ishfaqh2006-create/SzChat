import React, { useState, useRef } from 'react';
import { Message } from '../../types/index.js';
import { useAuth } from '../../context/AuthContext.js';
import { useChat } from '../../context/ChatContext.js';
import {
  Check,
  CheckCheck,
  Reply,
  Copy,
  Trash2,
  Edit2,
  MoreHorizontal,
  Play,
  Pause,
  FileText,
  Download,
  Share2,
  Eye,
  EyeOff,
  Star,
} from 'lucide-react';

interface MessageItemProps {
  message: Message;
  onReply: (msg: Message) => void;
  onForward: (msg: Message) => void;
  onEdit: (msg: Message) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, onReply, onForward, onEdit }) => {
  const { user } = useAuth();
  const { messages, deleteMessageForMe, deleteMessageForEveryone, openViewOnceMedia, reactToMessage } = useChat();

  const [showMenu, setShowMenu] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [viewOncePreviewUrl, setViewOncePreviewUrl] = useState<string | null>(null);
  const [isViewOnceModalOpen, setIsViewOnceModalOpen] = useState(false);
  const [activeImageLightboxUrl, setActiveImageLightboxUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const replyTarget = message.replyTo || (message.replyToId ? messages.find(m => m.id === message.replyToId) : undefined);

  const toggleReaction = (emoji: string) => {
    reactToMessage(message.id, emoji);
    setShowMenu(false);
  };

  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;

    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    touchTimerRef.current = setTimeout(() => {
      setShowMenu(true);
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const deltaX = e.touches[0].clientX - touchStartXRef.current;
    const deltaY = Math.abs(e.touches[0].clientY - touchStartYRef.current);

    if (Math.abs(deltaX) > 10 || deltaY > 10) {
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    }

    if (deltaX > 0 && deltaX < 100 && deltaX > deltaY) {
      setSwipeOffset(deltaX);
    }
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);

    if (swipeOffset > 45) {
      onReply(message);
    }
    setSwipeOffset(0);
  };

  const isMine = message.senderId === user?.id;

  // System Messages
  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-2 w-full">
        <span className="px-3 py-1 bg-zinc-200/80 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 text-[11px] font-medium rounded-full shadow-sm text-center">
          {message.content}
        </span>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setShowMenu(false);
  };

  const handleToggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  const handleViewOnceClick = () => {
    if (message.fileUrl) {
      setViewOncePreviewUrl(message.fileUrl);
      setIsViewOnceModalOpen(true);
      openViewOnceMedia(message.id);
    }
  };

  const formattedTime = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const displayReactions = message.reactions || [];

  return (
    <div
      id={`msg-${message.id}`}
      className="w-full flex flex-col my-1 transition-all"
      style={{
        transform: `translateX(${swipeOffset}px)`,
        transition: swipeOffset === 0 ? 'transform 0.2s ease-out' : 'none',
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className={`relative group max-w-[85%] sm:max-w-[70%] ${
          isMine ? 'ml-auto text-right' : 'mr-auto text-left'
        }`}
      >
        {/* Sender Name in Group Chat */}
        {!isMine && message.sender && (
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-0.5 block px-1">
            {message.sender.displayName}
          </span>
        )}

        {/* Reply Bubble Reference */}
        {replyTarget && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              const el = document.getElementById(`msg-${replyTarget.id}`);
              if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                el.classList.add('ring-2', 'ring-emerald-500');
                setTimeout(() => el.classList.remove('ring-2', 'ring-emerald-500'), 1500);
              }
            }}
            className="mb-1 p-2 bg-black/10 dark:bg-white/10 border-l-4 border-emerald-500 rounded-r-lg text-xs cursor-pointer hover:bg-black/15 dark:hover:bg-white/15 transition-colors"
            title="Click to jump to replied message"
          >
            <span className="font-semibold text-emerald-700 dark:text-emerald-400 block text-[10px]">
              {replyTarget.sender?.displayName || replyTarget.sender?.username || 'User'}
            </span>
            <span className="truncate block opacity-80 line-clamp-1">
              {replyTarget.content || (replyTarget.type === 'image' ? '📷 Photo' : replyTarget.type === 'audio' ? '🎵 Voice Message' : '📁 Attachment')}
            </span>
          </div>
        )}

        {/* Quick Reply Hover Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onReply(message);
          }}
          className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 bg-white dark:bg-zinc-800 text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-full shadow-md transition-all ${
            isMine ? '-left-8' : '-right-8'
          }`}
          title="Reply to message"
        >
          <Reply className="w-3.5 h-3.5" />
        </button>

        {/* Main Message Container */}
        <div
          onDoubleClick={(e) => {
            e.stopPropagation();
            setShowMenu(prev => !prev);
          }}
          className={`relative px-3 py-2 rounded-2xl shadow-sm text-sm break-words transition-all max-w-full cursor-pointer select-none ${
            isMine
              ? 'bg-emerald-600 text-white rounded-br-none'
              : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-zinc-700/80 rounded-bl-none'
          }`}
        >
          {/* Deleted Message Notice */}
          {message.isDeletedForEveryone ? (
            <p className="italic opacity-70 text-xs">This message was deleted.</p>
          ) : (
            <>
              {/* View Once Media */}
              {message.isViewOnce ? (
                message.isViewed ? (
                  <div className="flex items-center space-x-2 py-1 px-3 bg-zinc-800/40 rounded-xl text-zinc-400 text-xs italic my-1">
                    <EyeOff className="w-4 h-4 text-zinc-400" />
                    <span>Photo • Opened</span>
                  </div>
                ) : (
                  <button
                    onClick={handleViewOnceClick}
                    className="flex items-center space-x-2 py-1.5 px-3 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl text-xs font-medium my-1 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>1 Photo • View Once</span>
                  </button>
                )
              ) : (
                /* Regular Image Type */
                message.type === 'image' && message.fileUrl && (
                  <div
                    onClick={() => setActiveImageLightboxUrl(message.fileUrl!)}
                    className="mb-2 rounded-xl overflow-hidden max-w-sm cursor-pointer group/img relative"
                  >
                    <img
                      src={message.fileUrl}
                      alt="Shared image"
                      className="w-full max-h-80 object-cover rounded-xl group-hover/img:scale-[1.02] transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
                      Click to view full screen
                    </div>
                  </div>
                )
              )}

              {/* Audio Voice Note Type */}
              {message.type === 'audio' && message.fileUrl && (
                <div className="flex items-center space-x-3 py-1 px-2 min-w-[200px]">
                  <button
                    onClick={handleToggleAudio}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                      isMine ? 'bg-white text-emerald-600' : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {isPlayingAudio ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                  </button>
                  <audio
                    ref={audioRef}
                    src={message.fileUrl}
                    onEnded={() => setIsPlayingAudio(false)}
                    className="hidden"
                  />
                  <div className="flex-1">
                    <div className="h-1.5 bg-black/10 dark:bg-white/20 rounded-full overflow-hidden">
                      <div className={`h-full ${isMine ? 'bg-white' : 'bg-emerald-600'} w-1/2`} />
                    </div>
                    <span className="text-[10px] opacity-80 mt-1 block">Voice Message</span>
                  </div>
                </div>
              )}

              {/* Document File Type */}
              {message.type === 'file' && message.fileUrl && (
                <div className="flex items-center space-x-3 p-2 bg-black/5 dark:bg-white/5 rounded-xl mb-1">
                  <FileText className="w-8 h-8 text-emerald-500" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-xs truncate">{message.fileName || 'Attachment'}</p>
                    <p className="text-[10px] opacity-70">
                      {message.fileSize ? `${(message.fileSize / 1024).toFixed(1)} KB` : 'Document'}
                    </p>
                  </div>
                  <a
                    href={message.fileUrl}
                    download={message.fileName || 'file'}
                    className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
              )}

              {/* Text Content */}
              {message.content && message.type !== 'audio' && (
                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
              )}

              {/* Footer Meta: Time, Edit status & WhatsApp Ticks (Single Gray, Double Gray, Double Blue) */}
              <div
                className={`flex items-center justify-end space-x-1 text-[10px] mt-1 ${
                  isMine ? 'text-emerald-100' : 'text-zinc-400 dark:text-zinc-500'
                }`}
              >
                {message.isEdited && <span>edited</span>}
                <span>{formattedTime}</span>
                {isMine && (
                  <span className="ml-1 flex-shrink-0 inline-flex items-center">
                    {(message.status || 'sent').toLowerCase() === 'read' ? (
                      <CheckCheck className="w-3.5 h-3.5 text-sky-400 font-extrabold" title="Read" />
                    ) : (message.status || 'sent').toLowerCase() === 'delivered' ? (
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-200" title="Delivered" />
                    ) : (
                      <Check className="w-3.5 h-3.5 text-emerald-200/70" title="Sent" />
                    )}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Context Menu Dropdown */}
        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-40 bg-transparent"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
              }}
            />
            <div
              className={`absolute z-50 top-10 ${
                isMine ? 'right-0' : 'left-0'
              } w-48 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl py-1 text-xs animate-scaleIn`}
            >
            {/* Quick Emoji Reaction Bar */}
            <div className="px-2 py-1.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-around">
              {['👍', '❤️', '😂', '😮', '😢', '🔥'].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => toggleReaction(emoji)}
                  className="hover:scale-125 transition-transform text-sm p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                onReply(message);
                setShowMenu(false);
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center space-x-2 text-zinc-700 dark:text-zinc-300"
            >
              <Reply className="w-3.5 h-3.5" />
              <span>Reply</span>
            </button>

            <button
              onClick={() => {
                onForward(message);
                setShowMenu(false);
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center space-x-2 text-zinc-700 dark:text-zinc-300"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Forward</span>
            </button>

            <button
              onClick={handleCopy}
              className="w-full px-3 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center space-x-2 text-zinc-700 dark:text-zinc-300"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </button>

            <button
              onClick={() => {
                try {
                  const existing = JSON.parse(localStorage.getItem('szchat_starred_messages') || '[]');
                  if (!existing.some((m: any) => m.id === message.id)) {
                    existing.push(message);
                    localStorage.setItem('szchat_starred_messages', JSON.stringify(existing));
                    alert('Message starred!');
                  } else {
                    alert('Message is already starred');
                  }
                } catch (e) {}
                setShowMenu(false);
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center space-x-2 text-amber-500 font-medium"
            >
              <Star className="w-3.5 h-3.5 fill-amber-500" />
              <span>Star Message</span>
            </button>

            {isMine && !message.isDeletedForEveryone && (
              <button
                onClick={() => {
                  onEdit(message);
                  setShowMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center space-x-2 text-zinc-700 dark:text-zinc-300"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
            )}

            <button
              onClick={() => {
                deleteMessageForMe(message.id);
                setShowMenu(false);
              }}
              className="w-full px-3 py-1.5 text-left hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center space-x-2"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete for me</span>
            </button>

            {isMine && !message.isDeletedForEveryone && (
              <button
                onClick={() => {
                  deleteMessageForEveryone(message.id);
                  setShowMenu(false);
                }}
                className="w-full px-3 py-1.5 text-left hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center space-x-2 font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete for everyone</span>
              </button>
            )}
          </div>
        </>
        )}
      </div>

      {/* Emoji Reaction Badges */}
      {displayReactions.length > 0 && (
        <div className={`flex items-center space-x-1 mt-0.5 ${isMine ? 'justify-end ml-auto' : 'justify-start mr-auto'}`}>
          <div className="px-2 py-0.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full text-xs shadow-sm flex items-center space-x-1 animate-scaleIn">
            {displayReactions.map((r, idx) => (
              <span key={idx}>{r.emoji}</span>
            ))}
          </div>
        </div>
      )}

      {/* View-Once Photo Lightbox Modal */}
      {isViewOnceModalOpen && viewOncePreviewUrl && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-2xl flex items-center justify-between p-4 text-white z-10">
            <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-sm">
              <Eye className="w-5 h-5" />
              <span>View-Once Photo</span>
            </div>
            <button
              onClick={() => {
                setIsViewOnceModalOpen(false);
                setViewOncePreviewUrl(null);
              }}
              className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full text-white transition-colors"
            >
              Close & Discard
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-2 w-full max-w-4xl min-h-0">
            <img
              src={viewOncePreviewUrl}
              alt="View once photo"
              className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl border border-zinc-800"
            />
          </div>
          <p className="text-zinc-400 text-xs text-center pb-4">
            ⚠️ This photo will be removed permanently once closed.
          </p>
        </div>
      )}

      {/* Regular Image Lightbox Modal */}
      {activeImageLightboxUrl && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-3xl flex items-center justify-between p-3 text-white z-10">
            <span className="text-xs font-semibold text-zinc-300">Shared Image</span>
            <div className="flex items-center space-x-3">
              <a
                href={activeImageLightboxUrl}
                download={message.fileName || 'photo.jpg'}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download Photo</span>
              </a>
              <button
                onClick={() => setActiveImageLightboxUrl(null)}
                className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-full text-white transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-2 w-full max-w-4xl min-h-0">
            <img
              src={activeImageLightboxUrl}
              alt="Full view"
              className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};
