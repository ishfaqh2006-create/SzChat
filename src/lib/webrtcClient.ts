const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

function tuneOpusAudioSDP(sdp: string): string {
  if (!sdp.includes('opus')) return sdp;
  return sdp.replace(/a=fmtp:(\d+)(.*)/g, (match, pt, params) => {
    if (params.includes('maxaveragebitrate')) return match;
    return `a=fmtp:${pt} maxaveragebitrate=32000;useinbandfec=1;stereo=0;sprop-stereo=0${params}`;
  });
}

export class WebRTCClient {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private remoteAudioElement: HTMLAudioElement | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];

  public onIceCandidate?: (candidate: RTCIceCandidate) => void;
  public onTrack?: (stream: MediaStream) => void;

  constructor() {
    this.remoteAudioElement = document.createElement('audio');
    this.remoteAudioElement.autoplay = true;
    (this.remoteAudioElement as any).playsInline = true;
    document.body.appendChild(this.remoteAudioElement);
  }

  async getLocalMicrophoneStream(): Promise<MediaStream> {
    if (this.localStream) return this.localStream;

    this.localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: { max: 1 },
        sampleRate: { ideal: 48000 },
        sampleSize: { ideal: 16 },
      },
      video: false,
    });

    return this.localStream;
  }

  initPeerConnection(): RTCPeerConnection {
    if (this.peerConnection && this.peerConnection.signalingState !== 'closed') {
      return this.peerConnection;
    }

    this.peerConnection = new RTCPeerConnection(ICE_SERVERS);
    this.pendingCandidates = [];

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate && this.onIceCandidate) {
        this.onIceCandidate(event.candidate);
      }
    };

    this.peerConnection.ontrack = (event) => {
      console.log('WebRTC ontrack received:', event.track?.kind, event.streams?.length);
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
      } else {
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream();
        }
        if (event.track) {
          this.remoteStream.addTrack(event.track);
        }
      }

      if (this.remoteAudioElement && this.remoteStream) {
        this.remoteAudioElement.srcObject = this.remoteStream;
        this.remoteAudioElement.play().catch((e) => console.warn('Audio play error:', e));
      }
      if (this.onTrack && this.remoteStream) {
        this.onTrack(this.remoteStream);
      }
    };

    return this.peerConnection;
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const pc = this.initPeerConnection();
    const stream = await this.getLocalMicrophoneStream();
    const senders = pc.getSenders();

    stream.getTracks().forEach((track) => {
      const alreadyAdded = senders.some((s) => s.track === track);
      if (!alreadyAdded && pc.signalingState !== 'closed') {
        pc.addTrack(track, stream);
      }
    });

    const offer = await pc.createOffer();
    const tunedOffer = {
      type: offer.type,
      sdp: offer.sdp ? tuneOpusAudioSDP(offer.sdp) : offer.sdp,
    };
    await pc.setLocalDescription(tunedOffer);
    return tunedOffer;
  }

  async handleOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    const pc = this.initPeerConnection();
    const stream = await this.getLocalMicrophoneStream();
    const senders = pc.getSenders();

    stream.getTracks().forEach((track) => {
      const alreadyAdded = senders.some((s) => s.track === track);
      if (!alreadyAdded && pc.signalingState !== 'closed') {
        pc.addTrack(track, stream);
      }
    });

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    await this.processPendingCandidates();

    const answer = await pc.createAnswer();
    const tunedAnswer = {
      type: answer.type,
      sdp: answer.sdp ? tuneOpusAudioSDP(answer.sdp) : answer.sdp,
    };
    await pc.setLocalDescription(tunedAnswer);
    return tunedAnswer;
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (this.peerConnection && this.peerConnection.signalingState !== 'closed') {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      await this.processPendingCandidates();
    }
  }

  async addIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) {
      this.pendingCandidates.push(candidate);
      return;
    }

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn('Could not add ICE candidate:', err);
    }
  }

  private async processPendingCandidates() {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) return;

    while (this.pendingCandidates.length > 0) {
      const cand = this.pendingCandidates.shift();
      if (cand) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(cand));
        } catch (e) {
          console.warn('Error applying queued ICE candidate:', e);
        }
      }
    }
  }

  toggleMute(isMuted: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
    }
  }

  async toggleSpeaker(isSpeakerOn: boolean) {
    if (this.remoteAudioElement) {
      this.remoteAudioElement.volume = isSpeakerOn ? 1.0 : 0.4;
      try {
        if ('setSinkId' in this.remoteAudioElement && typeof (this.remoteAudioElement as any).setSinkId === 'function') {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const audioOutputs = devices.filter((device) => device.kind === 'audiooutput');

          if (audioOutputs.length > 0) {
            const chosen = isSpeakerOn
              ? audioOutputs.find((d) => d.label.toLowerCase().includes('speaker') || d.label.toLowerCase().includes('loud')) || audioOutputs[0]
              : audioOutputs.find((d) => d.label.toLowerCase().includes('earpiece') || d.label.toLowerCase().includes('phone')) || audioOutputs[0];
            if (chosen) {
              await (this.remoteAudioElement as any).setSinkId(chosen.deviceId);
            }
          }
        }
      } catch (err) {
        console.warn('Audio output device selection notice:', err);
      }
    }
  }

  cleanup() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.remoteAudioElement) {
      this.remoteAudioElement.srcObject = null;
    }
    this.pendingCandidates = [];
  }
}
