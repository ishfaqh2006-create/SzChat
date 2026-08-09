import React, { useState } from 'react';
import { Lock, Delete, Check } from 'lucide-react';

interface PinLockModalProps {
  storedPin: string;
  onUnlock: () => void;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({ storedPin, onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(false);

      if (nextPin.length === 4) {
        if (nextPin === storedPin) {
          onUnlock();
        } else {
          setError(true);
          setTimeout(() => {
            setPin('');
            setError(false);
          }, 600);
        }
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950 text-white p-4 backdrop-blur-2xl animate-fadeIn">
      <div className="w-full max-w-xs flex flex-col items-center space-y-6 text-center">
        <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center shadow-lg">
          <Lock className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-xl font-bold">SzChat Security Lock</h2>
          <p className="text-xs text-zinc-400 mt-1">Enter your 4-digit PIN to unlock</p>
        </div>

        {/* 4 Digit Indicators */}
        <div className="flex items-center space-x-4 my-2">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-4 h-4 rounded-full border-2 transition-all ${
                error
                  ? 'border-red-500 bg-red-500 animate-bounce'
                  : pin.length > idx
                  ? 'border-emerald-500 bg-emerald-500 scale-110'
                  : 'border-zinc-700 bg-transparent'
              }`}
            />
          ))}
        </div>

        {error && <p className="text-xs text-red-400 font-semibold animate-pulse">Incorrect PIN. Try again.</p>}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-4 w-full max-w-[240px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(num)}
              className="w-14 h-14 bg-zinc-900 hover:bg-zinc-800 active:bg-emerald-600 rounded-full text-lg font-bold flex items-center justify-center transition-colors shadow-md mx-auto"
            >
              {num}
            </button>
          ))}
          <div />
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="w-14 h-14 bg-zinc-900 hover:bg-zinc-800 active:bg-emerald-600 rounded-full text-lg font-bold flex items-center justify-center transition-colors shadow-md mx-auto"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="w-14 h-14 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full flex items-center justify-center transition-colors shadow-md mx-auto"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
