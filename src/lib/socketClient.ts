import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(token?: string): Socket | null {
  if (socket) return socket;

  if (!token) {
    const savedToken = localStorage.getItem('szchat_token');
    if (!savedToken) return null;
    token = savedToken;
  }

  socket = io(window.location.origin, {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    console.log('Socket connected successfully:', socket?.id);
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
