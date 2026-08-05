import React, { useState } from 'react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { Smile, Sparkles } from 'lucide-react';

interface EmojiStickerPickerProps {
  onSelectEmoji: (emoji: string) => void;
  onSelectSticker: (stickerUrl: string) => void;
  onClose: () => void;
}

const STICKERS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=sticker1',
  'https://api.dicebear.com/7.x/bottts/svg?seed=sticker2',
  'https://api.dicebear.com/7.x/bottts/svg?seed=sticker3',
  'https://api.dicebear.com/7.x/bottts/svg?seed=sticker4',
  'https://api.dicebear.com/7.x/bottts/svg?seed=sticker5',
  'https://api.dicebear.com/7.x/bottts/svg?seed=sticker6',
];

export const EmojiStickerPicker: React.FC<EmojiStickerPickerProps> = ({
  onSelectEmoji,
  onSelectSticker,
  onClose,
}) => {
  const [tab, setTab] = useState<'emojis' | 'stickers'>('emojis');

  return (
    <div className="absolute bottom-16 left-2 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden w-80 sm:w-96">
      {/* Header Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
        <button
          onClick={() => setTab('emojis')}
          className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center space-x-1.5 ${
            tab === 'emojis' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-zinc-500'
          }`}
        >
          <Smile className="w-4 h-4" />
          <span>Emojis</span>
        </button>

        <button
          onClick={() => setTab('stickers')}
          className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center space-x-1.5 ${
            tab === 'stickers' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-zinc-500'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Stickers</span>
        </button>
      </div>

      {tab === 'emojis' ? (
        <EmojiPicker
          onEmojiClick={(emojiData) => {
            onSelectEmoji(emojiData.emoji);
          }}
          theme={Theme.AUTO}
          width="100%"
          height={320}
        />
      ) : (
        <div className="p-4 grid grid-cols-3 gap-3 max-h-80 overflow-y-auto">
          {STICKERS.map((sticker, idx) => (
            <button
              key={idx}
              onClick={() => {
                onSelectSticker(sticker);
                onClose();
              }}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all hover:scale-105"
            >
              <img src={sticker} alt="Sticker" className="w-16 h-16 object-contain mx-auto" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
