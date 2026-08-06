import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { CallState, User, CallLog } from '../types/index.js';
import { useAuth } from './AuthContext.js';
import { getSocket } from '../lib/socketClient.js';
import { WebRTCClient } from '../lib/webrtcClient.js';
import { soundEffects } from '../lib/sound.js';

interface CallContextType {
  callState: CallState;
  startCall: (receiverUser: User, chatId: string) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  toggleMinimizeCall: () => void;
  callLogs: CallLog[];
  refreshCallLogs: () => Promise<void>;
}

const initialCallState: CallState = {
  callId: null,
  chatId: null,
  peerId: null,
  peerUser: null,
  isCaller: false,
  status: null,
  startTime: null,
  duration: 0,
  isMuted: false,
  isSpeakerOn: false,
  isMinimized: false,
};

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const [callState, setCallState] = useState<CallState>(initialCallState);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);

  const rtcClientRef = useRef<WebRTCClient | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const getRtcClient = () => {
    if (!rtcClientRef.current) {
      rtcClientRef.current = new WebRTCClient();
    }
    return rtcClientRef.current;
  };

  const refreshCallLogs = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/calls/history', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCallLogs(data.logs);
      }
    } catch (err) {
      console.error('Call log fetch error:', err);
    }
  }, [token]);

  useEffect(() => {
    refreshCallLogs();
  }, [refreshCallLogs]);

  // Duration Timer
  useEffect(() => {
    if (callState.status === 'connected') {
      timerRef.current = setInterval(() => {
        setCallState(prev => ({ ...prev, duration: prev.duration + 1 }));
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState.status]);

  const cleanupCall = useCallback(() => {
    if (rtcClientRef.current) {
      rtcClientRef.current.cleanup();
      rtcClientRef.current = null;
    }
    soundEffects.stopRingtone();
    setCallState(initialCallState);
    refreshCallLogs();
  }, [refreshCallLogs]);

  // Socket Call listeners
  useEffect(() => {
    if (!token || !user) return;
    const socket = getSocket(token);
    if (!socket) return;

    const handleIncoming = ({ callId, callerId, callerUser, chatId }: any) => {
      if (callState.status !== null) {
        socket.emit('call:busy', { callId, callerId });
        return;
      }

      setCallState({
        callId,
        chatId,
        peerId: callerId,
        peerUser: callerUser,
        isCaller: false,
        status: 'incoming',
        startTime: null,
        duration: 0,
        isMuted: false,
        isSpeakerOn: false,
      });

      soundEffects.startRingtone(true);
    };

    const handleAccepted = async ({ callId, calleeId }: any) => {
      soundEffects.stopRingtone();
      setCallState(prev => ({ ...prev, status: 'connected', startTime: Date.now() }));

      try {
        const rtc = getRtcClient();
        rtc.onIceCandidate = (candidate) => {
          socket.emit('call:ice-candidate', { targetId: calleeId, candidate });
        };

        const offerSdp = await rtc.createOffer();
        socket.emit('call:offer', { targetId: calleeId, sdp: offerSdp });
      } catch (err) {
        console.error('Error creating WebRTC offer:', err);
      }
    };

    const handleOffer = async ({ senderId, sdp }: any) => {
      try {
        const rtc = getRtcClient();
        rtc.onIceCandidate = (candidate) => {
          socket.emit('call:ice-candidate', { targetId: senderId, candidate });
        };

        const answerSdp = await rtc.handleOffer(sdp);
        socket.emit('call:answer', { targetId: senderId, sdp: answerSdp });
      } catch (err) {
        console.error('Error handling WebRTC offer:', err);
      }
    };

    const handleAnswer = async ({ sdp }: any) => {
      try {
        const rtc = getRtcClient();
        await rtc.handleAnswer(sdp);
      } catch (err) {
        console.error('Error handling WebRTC answer:', err);
      }
    };

    const handleIceCandidate = async ({ candidate }: any) => {
      try {
        const rtc = getRtcClient();
        await rtc.addIceCandidate(candidate);
      } catch (err) {
        console.error('Error adding ICE candidate:', err);
      }
    };

    const handleRejected = () => {
      soundEffects.stopRingtone();
      setCallState(prev => ({ ...prev, status: 'rejected' }));
      setTimeout(cleanupCall, 2000);
    };

    const handleBusy = () => {
      soundEffects.stopRingtone();
      setCallState(prev => ({ ...prev, status: 'busy' }));
      setTimeout(cleanupCall, 2000);
    };

    const handleUnavailable = () => {
      soundEffects.stopRingtone();
      setCallState(prev => ({ ...prev, status: 'ended' }));
      setTimeout(cleanupCall, 2000);
    };

    const handleEnded = () => {
      soundEffects.stopRingtone();
      cleanupCall();
    };

    socket.on('call:incoming', handleIncoming);
    socket.on('call:accepted', handleAccepted);
    socket.on('call:offer', handleOffer);
    socket.on('call:answer', handleAnswer);
    socket.on('call:ice-candidate', handleIceCandidate);
    socket.on('call:rejected', handleRejected);
    socket.on('call:busy', handleBusy);
    socket.on('call:unavailable', handleUnavailable);
    socket.on('call:ended', handleEnded);

    return () => {
      socket.off('call:incoming', handleIncoming);
      socket.off('call:accepted', handleAccepted);
      socket.off('call:offer', handleOffer);
      socket.off('call:answer', handleAnswer);
      socket.off('call:ice-candidate', handleIceCandidate);
      socket.off('call:rejected', handleRejected);
      socket.off('call:busy', handleBusy);
      socket.off('call:unavailable', handleUnavailable);
      socket.off('call:ended', handleEnded);
    };
  }, [token, user, callState.status, cleanupCall]);

  const startCall = async (receiverUser: User, chatId: string) => {
    if (!token || !user) return;
    const socket = getSocket(token);
    if (!socket) return;

    try {
      const rtc = getRtcClient();
      await rtc.getLocalMicrophoneStream(); // Request mic permission in click context
    } catch (err) {
      alert('Microphone permission is required to make a call.');
      return;
    }

    soundEffects.startRingtone(false);

    setCallState({
      callId: 'pending_' + Date.now(),
      chatId,
      peerId: receiverUser.id,
      peerUser: receiverUser,
      isCaller: true,
      status: 'dialing',
      startTime: null,
      duration: 0,
      isMuted: false,
      isSpeakerOn: false,
    });

    socket.emit('call:initiate', { receiverId: receiverUser.id, chatId });
  };

  const acceptCall = async () => {
    soundEffects.stopRingtone();
    if (!token || !callState.peerId || !callState.callId) return;
    const socket = getSocket(token);

    try {
      const rtc = getRtcClient();
      await rtc.getLocalMicrophoneStream(); // User gesture context permission
    } catch (err) {
      alert('Microphone permission is required to accept a call.');
      cleanupCall();
      return;
    }

    socket?.emit('call:accept', {
      callId: callState.callId,
      callerId: callState.peerId,
    });

    setCallState(prev => ({
      ...prev,
      status: 'connected',
      startTime: Date.now(),
    }));
  };

  const rejectCall = () => {
    soundEffects.stopRingtone();
    if (token && callState.peerId && callState.callId) {
      const socket = getSocket(token);
      socket?.emit('call:reject', {
        callId: callState.callId,
        callerId: callState.peerId,
      });
    }
    cleanupCall();
  };

  const endCall = () => {
    soundEffects.stopRingtone();
    if (token && callState.peerId) {
      const socket = getSocket(token);
      socket?.emit('call:end', {
        targetId: callState.peerId,
        duration: callState.duration,
      });
    }
    cleanupCall();
  };

  const toggleMute = () => {
    const newMute = !callState.isMuted;
    setCallState(prev => ({ ...prev, isMuted: newMute }));
    if (rtcClientRef.current) {
      rtcClientRef.current.toggleMute(newMute);
    }
  };

  const toggleSpeaker = () => {
    const newSpeaker = !callState.isSpeakerOn;
    setCallState(prev => ({ ...prev, isSpeakerOn: newSpeaker }));
    if (rtcClientRef.current) {
      rtcClientRef.current.toggleSpeaker(newSpeaker);
    }
  };

  const toggleMinimizeCall = () => {
    setCallState(prev => ({ ...prev, isMinimized: !prev.isMinimized }));
  };

  return (
    <CallContext.Provider
      value={{
        callState,
        startCall,
        acceptCall,
        rejectCall,
        endCall,
        toggleMute,
        toggleSpeaker,
        toggleMinimizeCall,
        callLogs,
        refreshCallLogs,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) throw new Error('useCall must be used within CallProvider');
  return context;
};
