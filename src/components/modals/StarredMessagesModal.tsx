import React, { useState, useEffect } from 'react';
import { Message } from '../../types/index.js';
import { Star, X, Trash2 } from 'lucide-react';
import { MessageItem } from '../chat/MessageItem.js';

interface StarredMessagesModalProps {
  onClose: () => void;
}

export const StarredMessagesModal: React.FC<StarredMessagesModalProps> = ({ onClose }) => {
  const [starredMessages, setStarredMessages] = useState<Message[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('szchat_starred_messages');
      if (raw) {
        setStarredMessages(JSON.parse(raw));
      }
    } catch (e) {
      console.warn('Failed to parse starred messages:', e);
    }
  }, []);

  const clearStarred = () => {
    localStorage.removeItem('szchat_starred_messages');
    setStarredMessages([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn text-white">
      <div className="w-full max-w-md bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-800 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-800/50">
          <div className="flex items-center space-x-2">
            <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
            <h3 className="font-bold text-sm text-white">Starred Messages</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {starredMessages.length === 0 ? (
            <div className="text-center p-8 space-y-2 text-zinc-500">
              <Star className="w-10 h-10 mx-auto text-zinc-700" />
              <p className="text-xs">No starred messages yet</p>
              <p className="text-[11px] text-zinc-600">Star messages to save important info for easy reference.</p>
            </div>
          ) : (
            starredMessages.map((msg) => (
              <div key={msg.id} className="p-3 bg-zinc-800/60 rounded-xl border border-zinc-700/50">
                <p className="text-xs text-zinc-200 font-medium">{msg.content || '[Media Message]'}</p>
                <span className="text-[10px] text-zinc-400 mt-1 block font-mono">
                  {new Date(msg.createdAt).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>

        {starredMessages.length > 0 && (
          <div className="p-3 border-t border-zinc-800 bg-zinc-950/60">
            <button
              onClick={clearStarred}
              className="w-full py-2 bg-red-950/40 hover:bg-red-900/50 text-red-400 font-semibold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors border border-red-900/50"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear All Starred Messages</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
