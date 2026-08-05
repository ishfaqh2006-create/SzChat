import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Trash2, Send } from 'lucide-react';

interface VoiceRecorderProps {
  onSendVoiceNote: (fileDataUrl: string) => void;
  onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSendVoiceNote, onCancel }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    startRecording();
    return () => {
      stopRecordingCleanup();
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access error:', err);
      alert('Could not access microphone');
      onCancel();
    }
  };

  const stopRecordingCleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current.stop();
    }
  };

  const handleFinishAndSend = () => {
    if (!mediaRecorderRef.current) return;

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        onSendVoiceNote(base64data);
      };
      reader.readAsDataURL(blob);
    };

    stopRecordingCleanup();
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${rem.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center space-x-3 w-full bg-red-50 dark:bg-red-950/40 p-2 px-4 rounded-2xl border border-red-200 dark:border-red-900 animate-pulse">
      <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
        <Mic className="w-5 h-5 animate-bounce" />
        <span className="font-mono text-sm font-bold">{formatTimer(duration)}</span>
      </div>

      <div className="flex-1 h-1 bg-red-200 dark:bg-red-900 rounded-full overflow-hidden">
        <div className="h-full bg-red-600 w-full animate-ping" />
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={() => {
            stopRecordingCleanup();
            onCancel();
          }}
          className="p-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-xl"
          title="Discard Voice Note"
        >
          <Trash2 className="w-5 h-5 text-red-500" />
        </button>

        <button
          onClick={handleFinishAndSend}
          className="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg transition-all"
          title="Send Voice Note"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
