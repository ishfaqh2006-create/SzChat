import React from 'react';
import { useCall } from '../../context/CallContext.js';
import { Avatar } from '../common/Avatar.js';
import {
  PhoneCall,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  PhoneIncoming,
  PhoneOutgoing,
} from 'lucide-react';

export const CallOverlay: React.FC = () => {
  const { callState, acceptCall, rejectCall, endCall, toggleMute, toggleSpeaker } = useCall();

  if (!callState.status) return null;

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  const peerName = callState.peerUser?.displayName || 'Unknown User';

  // Incoming Banner Mode
  if (callState.status === 'incoming') {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md p-4 bg-zinc-900/95 text-white rounded-2xl shadow-2xl border border-zinc-700 backdrop-blur-md animate-bounce">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar src={callState.peerUser?.avatarUrl} name={peerName} size="lg" />
            <div>
              <h4 className="font-bold text-sm text-white">{peerName}</h4>
              <p className="text-xs text-emerald-400 flex items-center space-x-1 mt-0.5">
                <PhoneIncoming className="w-3.5 h-3.5 animate-pulse" />
                <span>Incoming audio call...</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={rejectCall}
              className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-full shadow-lg transition-transform hover:scale-105"
              title="Decline Call"
            >
              <PhoneOff className="w-5 h-5" />
            </button>

            <button
              onClick={acceptCall}
              className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg transition-transform hover:scale-105"
              title="Accept Call"
            >
              <PhoneCall className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active / Dialing Call Modal
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/90 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-sm bg-zinc-900 text-white rounded-3xl shadow-2xl border border-zinc-800 p-8 text-center flex flex-col items-center justify-between min-h-[420px]">
        {/* Peer Info */}
        <div className="space-y-4">
          <div className="relative inline-block">
            <Avatar
              src={callState.peerUser?.avatarUrl}
              name={peerName}
              size="xl"
              className="w-24 h-24 text-2xl mx-auto shadow-2xl ring-4 ring-emerald-500/20"
            />
            <div className="absolute -bottom-1 -right-1 p-2 bg-emerald-600 rounded-full border-2 border-zinc-900">
              <PhoneCall className="w-4 h-4 text-white" />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white">{peerName}</h2>
            <p className="text-xs text-zinc-400 mt-1 font-mono">
              {callState.status === 'dialing' ? (
                <span className="text-emerald-400 animate-pulse">Calling...</span>
              ) : callState.status === 'connected' ? (
                <span className="text-emerald-400 font-bold text-sm">
                  {formatTimer(callState.duration)}
                </span>
              ) : (
                <span className="capitalize">{callState.status}</span>
              )}
            </p>
          </div>
        </div>

        {/* Audio controls */}
        {callState.status === 'connected' && (
          <div className="flex items-center space-x-6 my-6">
            <button
              onClick={toggleMute}
              className={`p-4 rounded-2xl transition-all ${
                callState.isMuted
                  ? 'bg-red-600/20 text-red-400 border border-red-500/30'
                  : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
              }`}
              title={callState.isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {callState.isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>

            <button
              onClick={toggleSpeaker}
              className={`p-4 rounded-2xl transition-all ${
                callState.isSpeakerOn
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
              }`}
              title="Toggle Speaker"
            >
              {callState.isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
            </button>
          </div>
        )}

        {/* End Call Button */}
        <div className="w-full pt-4">
          <button
            onClick={endCall}
            className="w-full py-3.5 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold rounded-2xl shadow-xl flex items-center justify-center space-x-2 transition-all hover:scale-105"
          >
            <PhoneOff className="w-5 h-5" />
            <span>End Call</span>
          </button>
        </div>
      </div>
    </div>
  );
};
