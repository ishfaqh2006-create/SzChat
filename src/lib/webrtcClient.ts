const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

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
      this.remoteStream = event.streams[0];
      if (this.remoteAudioElement) {
        this.remoteAudioElement.srcObject = this.remoteStream;
        this.remoteAudioElement.play().catch((e) => console.warn('Audio play error:', e));
      }
      if (this.onTrack) {
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
    await pc.setLocalDescription(offer);
    return offer;
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
    await pc.setLocalDescription(answer);
    return answer;
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

  toggleSpeaker(isSpeakerOn: boolean) {
    if (this.remoteAudioElement) {
      this.remoteAudioElement.volume = isSpeakerOn ? 1.0 : 0.7;
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
