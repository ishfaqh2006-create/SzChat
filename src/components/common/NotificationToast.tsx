import React from 'react';
import { Avatar } from './Avatar.js';
import { Bell, X } from 'lucide-react';

export interface ToastData {
  id: string;
  chatId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
}

interface NotificationToastProps {
  toast: ToastData | null;
  onSelect: (chatId: string) => void;
  onDismiss: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  toast,
  onSelect,
  onDismiss,
}) => {
  if (!toast) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 animate-slideDown">
      <div
        onClick={() => {
          onSelect(toast.chatId);
          onDismiss();
        }}
        className="bg-zinc-900/95 dark:bg-zinc-900/95 border border-emerald-500/40 text-white p-3 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center space-x-3 cursor-pointer hover:bg-zinc-800 transition-all"
      >
        <Avatar src={toast.senderAvatar} name={toast.senderName} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-1.5">
            <Bell className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-400 truncate">{toast.senderName}</span>
          </div>
          <p className="text-xs text-zinc-200 truncate mt-0.5">{toast.content}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
          className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
