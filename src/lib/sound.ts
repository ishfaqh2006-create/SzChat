class SoundEffects {
  private ctx: AudioContext | null = null;
  private ringtoneInterval: number | null = null;

  public isSoundMuted(): boolean {
    return localStorage.getItem('szchat_sound_muted') === 'true';
  }

  public setSoundMuted(muted: boolean) {
    localStorage.setItem('szchat_sound_muted', muted ? 'true' : 'false');
  }

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  playMessageSent() {
    if (this.isSoundMuted()) return;
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08); // A5

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) {
      console.error(e);
    }
  }

  playMessageReceived() {
    if (this.isSoundMuted()) return;
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.06);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch (e) {
      console.error(e);
    }
  }

  startRingtone(isIncoming = true) {
    this.stopRingtone();
    if (this.isSoundMuted()) return;

    const playPulse = () => {
      if (this.isSoundMuted()) return;
      try {
        const ctx = this.getContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        if (isIncoming) {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
          osc.frequency.setValueAtTime(554.37, ctx.currentTime + 0.2); // C#5
          osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.4); // E5
        } else {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, ctx.currentTime);
          osc.frequency.setValueAtTime(480, ctx.currentTime + 0.1);
        }

        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (isIncoming ? 0.8 : 1.2));

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + (isIncoming ? 0.8 : 1.2));
      } catch (e) {
        console.error(e);
      }
    };

    playPulse();
    this.ringtoneInterval = window.setInterval(playPulse, isIncoming ? 1800 : 2500);
  }

  stopRingtone() {
    if (this.ringtoneInterval !== null) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
  }
}

export const soundEffects = new SoundEffects();
