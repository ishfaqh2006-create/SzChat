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
} from 'lucide-react';

interface MessageItemProps {
  message: Message;
  onReply: (msg: Message) => void;
  onForward: (msg: Message) => void;
  onEdit: (msg: Message) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, onReply, onForward, onEdit }) => {
  const { user } = useAuth();
  const { deleteMessageForMe, deleteMessageForEveryone, openViewOnceMedia } = useChat();

  const [showMenu, setShowMenu] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [viewOncePreviewUrl, setViewOncePreviewUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isMine = message.senderId === user?.id;

  // System Messages
  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-2">
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
      openViewOnceMedia(message.id);
    }
  };

  const formattedTime = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex flex-col my-1 group ${isMine ? 'items-end' : 'items-start'}`}>
      <div className="relative max-w-[85%] sm:max-w-[70%]">
        {/* Sender Name in Group Chat */}
        {!isMine && message.sender && (
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-0.5 block px-1">
            {message.sender.displayName}
          </span>
        )}

        {/* Reply Bubble Reference */}
        {message.replyTo && (
          <div className="mb-1 p-2 bg-black/5 dark:bg-white/5 border-l-4 border-emerald-500 rounded-r-lg text-xs">
            <span className="font-semibold text-emerald-700 dark:text-emerald-400 block text-[10px]">
              {message.replyTo.sender?.displayName || 'User'}
            </span>
            <span className="truncate block opacity-80 line-clamp-1">{message.replyTo.content}</span>
          </div>
        )}

        {/* Main Message Container */}
        <div
          className={`relative px-3 py-2 rounded-2xl shadow-sm text-sm break-words transition-all ${
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
                  <div className="mb-2 rounded-xl overflow-hidden max-w-sm">
                    <img
                      src={message.fileUrl}
                      alt="Shared image"
                      className="w-full max-h-80 object-cover rounded-xl"
                    />
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

          {/* Action Trigger Button on Hover */}
          <button
            onClick={() => setShowMenu(!showMenu)}
            className={`absolute top-1 right-1 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity ${
              isMine
                ? 'bg-emerald-700/80 text-white hover:bg-emerald-800'
                : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200'
            }`}
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Context Menu Dropdown */}
        {showMenu && (
          <div
            className={`absolute z-30 top-8 ${
              isMine ? 'right-0' : 'left-0'
            } w-40 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl py-1 text-xs`}
          >
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
        )}
      </div>
    </div>
  );
};
