import React, { useState, useRef } from 'react';
import { useChat } from '../../context/ChatContext.js';
import { VoiceRecorder } from './VoiceRecorder.js';
import { EmojiStickerPicker } from './EmojiStickerPicker.js';
import { Message } from '../../types/index.js';
import { Smile, Paperclip, Mic, Send, X, Edit2, Eye } from 'lucide-react';

interface MessageInputProps {
  replyingTo: Message | null;
  editingMessage: Message | null;
  onClearReply: () => void;
  onClearEdit: () => void;
}

export const MessageInput: React.FC<MessageInputProps> = ({
  replyingTo,
  editingMessage,
  onClearReply,
  onClearEdit,
}) => {
  const { sendMessage, editMessage, sendTyping } = useChat();
  const [content, setContent] = useState('');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [isViewOnceEnabled, setIsViewOnceEnabled] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textInputRef = useRef<HTMLTextAreaElement | null>(null);

  const [isReadOnly, setIsReadOnly] = useState(true);

  // Auto-focus input when replying or editing
  React.useEffect(() => {
    if (editingMessage) {
      setContent(editingMessage.content);
      setIsReadOnly(false);
      textInputRef.current?.focus({ preventScroll: true });
    } else if (replyingTo) {
      setIsReadOnly(false);
      textInputRef.current?.focus({ preventScroll: true });
    }
  }, [editingMessage, replyingTo]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const toSend = content.trim();
    if (!toSend) return;

    setContent('');
    sendTyping(false);

    // Focus input on desktop send only; avoid keyboard trap on mobile
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      setTimeout(() => {
        textInputRef.current?.focus({ preventScroll: true });
      }, 10);
    }

    if (editingMessage) {
      await editMessage(editingMessage.id, toSend);
      onClearEdit();
    } else {
      await sendMessage(toSend, 'text', undefined, replyingTo?.id);
      if (replyingTo) onClearReply();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setContent(e.target.value);
    sendTyping(e.target.value.length > 0);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const isImg = file.type.startsWith('image/');
      await sendMessage(
        isImg ? '' : file.name,
        isImg ? 'image' : 'file',
        {
          fileUrl: base64,
          fileName: file.name,
          fileSize: file.size,
        },
        replyingTo?.id,
        isImg && isViewOnceEnabled
      );
      if (replyingTo) onClearReply();
      setIsViewOnceEnabled(false);
    };
    reader.readAsDataURL(file);

    // Reset input
    e.target.value = '';
  };

  const handleSendVoiceNote = async (dataUrl: string) => {
    await sendMessage('', 'audio', { fileUrl: dataUrl, fileName: 'voice_note.webm' });
    setIsRecordingVoice(false);
  };

  const handleSelectSticker = async (stickerUrl: string) => {
    await sendMessage('', 'image', { fileUrl: stickerUrl, fileName: 'sticker.svg' });
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 p-3 relative flex-shrink-0 z-20 w-full">
      {/* Replying Bar */}
      {replyingTo && (
        <div className="mb-2 p-2 px-3 bg-zinc-100 dark:bg-zinc-800/80 border-l-4 border-emerald-500 rounded-r-xl flex items-center justify-between text-xs">
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 block">
              Replying to {replyingTo.sender?.displayName || 'User'}
            </span>
            <span className="truncate block text-zinc-600 dark:text-zinc-300">{replyingTo.content}</span>
          </div>
          <button onClick={onClearReply} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg">
            <X className="w-4 h-4 text-zinc-500" />
          </button>
        </div>
      )}

      {/* Editing Bar */}
      {editingMessage && (
        <div className="mb-2 p-2 px-3 bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500 rounded-r-xl flex items-center justify-between text-xs">
          <div className="min-w-0 flex-1 flex items-center space-x-2">
            <Edit2 className="w-4 h-4 text-amber-500" />
            <span className="font-semibold text-amber-600 dark:text-amber-400">Editing Message</span>
          </div>
          <button onClick={onClearEdit} className="p-1 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-lg">
            <X className="w-4 h-4 text-zinc-500" />
          </button>
        </div>
      )}

      {/* Emoji & Sticker Picker */}
      {showPicker && (
        <EmojiStickerPicker
          onSelectEmoji={(emoji) => setContent((prev) => prev + emoji)}
          onSelectSticker={handleSelectSticker}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* Voice Recorder Mode */}
      {isRecordingVoice ? (
        <VoiceRecorder
          onSendVoiceNote={handleSendVoiceNote}
          onCancel={() => setIsRecordingVoice(false)}
        />
      ) : (
        <div className="flex items-center space-x-1 sm:space-x-2 w-full max-w-full overflow-hidden">
          <button
            type="button"
            onClick={() => setShowPicker(!showPicker)}
            className="p-1.5 sm:p-2 text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors flex-shrink-0"
            title="Emojis & Stickers"
          >
            <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 sm:p-2 text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors flex-shrink-0"
            title="Attach file or image"
          >
            <Paperclip className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* View Once Photo Toggle */}
          <button
            type="button"
            onClick={() => setIsViewOnceEnabled(!isViewOnceEnabled)}
            className={`p-1.5 sm:p-2 rounded-xl transition-colors flex items-center space-x-0.5 sm:space-x-1 flex-shrink-0 ${
              isViewOnceEnabled
                ? 'bg-emerald-500/20 text-emerald-500 font-semibold'
                : 'text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
            title="Toggle View Once Photo"
          >
            <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
            {isViewOnceEnabled && <span className="text-[10px] uppercase font-bold">1x</span>}
          </button>

          <textarea
            rows={1}
            enterKeyHint="send"
            ref={textInputRef}
            id="chat_message_input"
            name="message_text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="sentences"
            spellCheck={false}
            value={content}
            onChange={handleTextChange}
            onFocus={() => {
              window.scrollTo(0, 0);
              document.body.scrollTop = 0;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={isViewOnceEnabled ? 'Send View Once photo...' : 'Type a message...'}
            className="flex-1 min-w-0 px-2.5 sm:px-4 py-2 sm:py-2.5 bg-zinc-100 dark:bg-zinc-800/80 border border-transparent focus:border-emerald-500/50 rounded-xl text-xs sm:text-sm focus:outline-none dark:text-white placeholder-zinc-400 transition-all resize-none max-h-24 overflow-y-auto leading-normal"
          />

          {content.trim() ? (
            <button
              type="button"
              onClick={() => handleSend()}
              className="p-2 sm:p-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsRecordingVoice(true)}
              className="p-2 sm:p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex-shrink-0"
              title="Record voice note"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
