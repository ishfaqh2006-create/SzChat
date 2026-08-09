import React, { useState } from 'react';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { Smile, Sparkles, Image as ImageIcon } from 'lucide-react';

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

const GIFS = [
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2R4bHFnbmVzcWhicnI1azA1M3RnMmV5MGZ3dndrdXJicHF0NWVjMSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0HlHFRbmaZtBRhXG/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExN3QzOHRmb2F3bmx5cmQybTFmaXExdzYxdWR4Nm4ybXdsYnhsbWRnbCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKSjRrfIPjeiVyM/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExeGJ3cmZ4ZXBtbWZicHRtNmUwbXZmd2J0OXNmMG8yZjNkbWkyc3hvaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0AMJLGGXb7j2wR8i/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMXlpaWZ2azhycm4xMWhrdnZkY3Iwd2VpMnAwdXZqOTJsbDRmd2RiaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/d31w24psGYeedC64/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExbmszMnAycDkzazg0bmplZHQ0NWhwOWs3Z3lnN3BvMnRwZjcxNWdybiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/xT0xezQGU5xCDJuCPe/giphy.gif',
  'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExYnJ2bWZvdWZ6dWlyZ2IxdnJjZmZsaWw0MmsyMTlqczdpNmhrZjFlcyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oKIPdOPE55rRGTLmU/giphy.gif',
];

export const EmojiStickerPicker: React.FC<EmojiStickerPickerProps> = ({
  onSelectEmoji,
  onSelectSticker,
  onClose,
}) => {
  const [tab, setTab] = useState<'emojis' | 'stickers' | 'gifs'>('emojis');

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

        <button
          onClick={() => setTab('gifs')}
          className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center space-x-1.5 ${
            tab === 'gifs' ? 'text-emerald-600 border-b-2 border-emerald-600' : 'text-zinc-500'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>GIFs</span>
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
      ) : tab === 'stickers' ? (
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
      ) : (
        <div className="p-3 grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
          {GIFS.map((gif, idx) => (
            <button
              key={idx}
              onClick={() => {
                onSelectSticker(gif);
                onClose();
              }}
              className="hover:opacity-80 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 hover:scale-[1.02] transition-transform"
            >
              <img src={gif} alt="GIF" className="w-full h-24 object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
