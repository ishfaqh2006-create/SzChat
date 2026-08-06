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
  Minimize2,
  Maximize2,
  ArrowLeft,
  Headphones,
} from 'lucide-react';

export const CallOverlay: React.FC = () => {
  const { callState, acceptCall, rejectCall, endCall, toggleMute, toggleSpeaker, toggleMinimizeCall } = useCall();

  if (!callState.status) return null;

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  const peerName = callState.peerUser?.displayName || 'Unknown User';

  // 1. Incoming Call Top Banner Mode
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

  // 2. Minimized Floating Top Call Bar Mode (WhatsApp style)
  if (callState.isMinimized) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-emerald-700/95 text-white px-4 py-2.5 shadow-xl backdrop-blur-md flex items-center justify-between border-b border-emerald-600/50 animate-slideDown">
        <div
          onClick={toggleMinimizeCall}
          className="flex items-center space-x-3 cursor-pointer flex-1 min-w-0"
        >
          <div className="relative">
            <Avatar src={callState.peerUser?.avatarUrl} name={peerName} size="sm" />
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
          </div>
          <div className="truncate">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-xs truncate">{peerName}</span>
              <span className="text-[10px] bg-emerald-800/60 px-2 py-0.5 rounded-full font-mono font-semibold">
                {callState.status === 'connected' ? formatTimer(callState.duration) : 'Calling...'}
              </span>
            </div>
            <p className="text-[10px] text-emerald-100/80">Tap to return to call screen</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 ml-3">
          <button
            onClick={toggleMute}
            className={`p-2 rounded-full transition-colors ${
              callState.isMuted ? 'bg-red-600 text-white' : 'bg-emerald-800/60 text-white hover:bg-emerald-800'
            }`}
            title={callState.isMuted ? 'Unmute' : 'Mute'}
          >
            {callState.isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleSpeaker}
            className={`p-2 rounded-full transition-colors ${
              callState.isSpeakerOn ? 'bg-white text-emerald-700' : 'bg-emerald-800/60 text-white hover:bg-emerald-800'
            }`}
            title="Speaker / Earpiece"
          >
            {callState.isSpeakerOn ? <Volume2 className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
          </button>

          <button
            onClick={endCall}
            className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-full transition-transform hover:scale-105"
            title="End Call"
          >
            <PhoneOff className="w-4 h-4" />
          </button>

          <button
            onClick={toggleMinimizeCall}
            className="p-2 bg-emerald-800/60 hover:bg-emerald-800 text-white rounded-full"
            title="Expand Call View"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // 3. Full-Screen Call Screen View
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/95 backdrop-blur-xl animate-fadeIn">
      <div className="w-full max-w-sm bg-zinc-900/90 text-white rounded-3xl shadow-2xl border border-zinc-800 p-6 text-center flex flex-col items-center justify-between min-h-[460px] relative overflow-hidden">
        {/* Top Header: Return to Chat Button */}
        <div className="w-full flex items-center justify-between z-10 mb-2">
          <button
            onClick={toggleMinimizeCall}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-zinc-800/80 hover:bg-zinc-700/80 rounded-xl text-xs font-semibold text-zinc-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Chat</span>
          </button>

          <button
            onClick={toggleMinimizeCall}
            className="p-2 bg-zinc-800/80 hover:bg-zinc-700/80 rounded-xl text-zinc-300 transition-colors"
            title="Minimize Call"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Peer Info with Ambient Pulse Effect */}
        <div className="space-y-4 my-auto z-10">
          <div className="relative inline-block my-2">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping scale-125" />
            <Avatar
              src={callState.peerUser?.avatarUrl}
              name={peerName}
              size="xl"
              className="w-28 h-28 text-3xl mx-auto shadow-2xl ring-4 ring-emerald-500/30 relative z-10"
            />
            <div className="absolute -bottom-1 -right-1 p-2.5 bg-emerald-600 rounded-full border-2 border-zinc-900 shadow-lg z-20">
              <PhoneCall className="w-4 h-4 text-white" />
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white tracking-wide">{peerName}</h2>
            <p className="text-xs text-zinc-400 mt-1.5 font-mono">
              {callState.status === 'dialing' ? (
                <span className="text-emerald-400 animate-pulse font-semibold">Calling...</span>
              ) : callState.status === 'connected' ? (
                <span className="text-emerald-400 font-bold text-base tracking-widest">
                  {formatTimer(callState.duration)}
                </span>
              ) : (
                <span className="capitalize text-zinc-400">{callState.status}</span>
              )}
            </p>
          </div>
        </div>

        {/* Audio controls */}
        {callState.status === 'connected' && (
          <div className="flex items-center space-x-6 my-6 z-10">
            <button
              onClick={toggleMute}
              className={`p-4 rounded-2xl transition-all shadow-lg ${
                callState.isMuted
                  ? 'bg-red-600 text-white border border-red-500'
                  : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
              }`}
              title={callState.isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              {callState.isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>

            <button
              onClick={toggleSpeaker}
              className={`p-4 rounded-2xl transition-all shadow-lg ${
                callState.isSpeakerOn
                  ? 'bg-emerald-600 text-white border border-emerald-500'
                  : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
              }`}
              title={callState.isSpeakerOn ? 'Loud Speaker active' : 'Ear Speaker active'}
            >
              {callState.isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <Headphones className="w-6 h-6" />}
            </button>
          </div>
        )}

        {/* End Call Button */}
        <div className="w-full pt-2 z-10">
          <button
            onClick={endCall}
            className="w-full py-4 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-bold rounded-2xl shadow-xl flex items-center justify-center space-x-2 transition-all hover:scale-[1.02]"
          >
            <PhoneOff className="w-5 h-5" />
            <span>End Call</span>
          </button>
        </div>
      </div>
    </div>
  );
};

