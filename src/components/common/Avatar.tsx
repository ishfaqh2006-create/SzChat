import React from 'react';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ src, name, size = 'md', isOnline, className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  };

  const badgeSizeClasses = {
    sm: 'w-2.5 h-2.5 border',
    md: 'w-3 h-3 border-2',
    lg: 'w-3.5 h-3.5 border-2',
    xl: 'w-4 h-4 border-2',
  };

  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative inline-block flex-shrink-0">
      {src ? (
        <img
          src={src}
          alt={name}
          className={`${sizeClasses[size]} rounded-full object-cover bg-emerald-100 text-emerald-800 font-semibold ${className}`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full bg-emerald-600 text-white font-semibold flex items-center justify-center select-none ${className}`}
        >
          {initials || '?'}
        </div>
      )}

      {isOnline !== undefined && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-white dark:border-zinc-900 ${
            badgeSizeClasses[size]
          } ${isOnline ? 'bg-emerald-500' : 'bg-zinc-400'}`}
        />
      )}
    </div>
  );
};
