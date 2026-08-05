import React from 'react';
import { useCall } from '../../context/CallContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { Avatar } from '../common/Avatar.js';
import { PhoneIncoming, PhoneOutgoing, PhoneMissed, Phone, Clock } from 'lucide-react';

export const CallHistory: React.FC = () => {
  const { callLogs, startCall } = useCall();
  const { user } = useAuth();

  const formatDuration = (secs: number) => {
    if (secs === 0) return '0s';
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return mins > 0 ? `${mins}m ${rem}s` : `${rem}s`;
  };

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-1">
      <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
        Call History
      </div>

      {callLogs.length === 0 ? (
        <div className="py-12 text-center text-zinc-400 dark:text-zinc-500 text-xs flex flex-col items-center">
          <Phone className="w-8 h-8 opacity-30 mb-2" />
          <span>No recent calls</span>
        </div>
      ) : (
        callLogs.map((log) => {
          const isOutgoing = log.callerId === user?.id;
          const peerUser = isOutgoing ? log.receiver : log.caller;
          const peerName = peerUser?.displayName || 'Unknown';

          let statusIcon = <PhoneOutgoing className="w-3.5 h-3.5 text-emerald-500" />;
          if (!isOutgoing) {
            statusIcon = log.status === 'missed' ? (
              <PhoneMissed className="w-3.5 h-3.5 text-red-500" />
            ) : (
              <PhoneIncoming className="w-3.5 h-3.5 text-sky-500" />
            );
          }

          const formattedTime = new Date(log.createdAt).toLocaleDateString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div
              key={log.id}
              className="flex items-center justify-between p-3 rounded-2xl hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
            >
              <div className="flex items-center space-x-3 min-w-0">
                <Avatar src={peerUser?.avatarUrl} name={peerName} size="md" />

                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {peerName}
                  </h4>
                  <div className="flex items-center space-x-1 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {statusIcon}
                    <span className="capitalize">{log.status}</span>
                    <span>•</span>
                    <span>{formatDuration(log.duration)}</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 flex items-center space-x-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    <span>{formattedTime}</span>
                  </div>
                </div>
              </div>

              {peerUser && (
                <button
                  onClick={() => startCall(peerUser, log.chatId)}
                  className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900 rounded-xl transition-colors"
                  title={`Call ${peerName}`}
                >
                  <Phone className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};
