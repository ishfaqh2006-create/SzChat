import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let currentToken: string | null = null;

export function getSocket(token?: string): Socket | null {
  const activeToken = token || localStorage.getItem('szchat_token');
  if (!activeToken) {
    if (socket) {
      socket.disconnect();
      socket = null;
      currentToken = null;
    }
    return null;
  }

  // Reuse existing active socket if token matches and is connected
  if (socket && currentToken === activeToken && (socket.connected || socket.active)) {
    return socket;
  }

  // Clean up stale socket
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  currentToken = activeToken;

  socket = io(window.location.origin, {
    auth: { token: activeToken },
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
    if (reason === 'io server disconnect') {
      socket?.connect();
    }
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentToken = null;
  }
}
