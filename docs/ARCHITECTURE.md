# SzChat Production Monorepo Architecture

## 1. System Overview
SzChat is a full-stack real-time messaging and WebRTC audio call platform designed as a modular monorepo structure.

```
SzChat/
├── backend/            # Express, Socket.IO, Auth, Services, Controllers
├── frontend/           # React, Vite, Tailwind CSS, WebRTC Client
├── database/           # PostgreSQL Schema (Prisma ORM)
├── docs/               # System & API Specifications
├── server.ts           # Root server entrypoint (Express + Vite setup)
├── package.json        # Unified dependency manifest
└── vite.config.ts      # Vite bundler configuration
```

## 2. Layer Specifications

### A. Frontend Layer (`frontend/`)
- **UI Framework**: React 19 + TypeScript + Tailwind CSS
- **Icons & Motion**: Lucide React + Motion
- **Audio Recorder**: MediaRecorder API for webm voice notes
- **WebRTC Engine**: Native `RTCPeerConnection` with ICE candidate exchange
- **State Management**: React Context (`AuthContext`, `ChatContext`, `CallContext`)

### B. Backend Layer (`backend/`)
- **HTTP Engine**: Express v4
- **Realtime Engine**: Socket.IO v4
- **Auth Engine**: JWT (JSON Web Tokens) & `bcryptjs` password hashing
- **APIs**: Auth, Users, Chats, Messages, Media Upload, WebRTC Call logs
- **Realtime Events**: Typing, Online Presence, Delivery/Read Receipts, WebRTC SDP offer/answer/ICE signaling.

### C. Database Layer (`database/`)
- **ORM**: Prisma Schema v6
- **Database**: PostgreSQL (compatible with cloud PostgreSQL / SQLite fallback storage engine)
- **Entities**: User, Session, Chat, ChatMember, Message, MessageStatus, Attachment, Group, GroupMember, Call, CallParticipant, Settings.

## 3. WebRTC Call Flow Sequence
1. **Caller** triggers call request -> Backend emits `call:incoming` via Socket.IO.
2. **Callee** receives notification & accepts call -> Backend emits `call:accepted`.
3. **Peer-to-Peer SDP**: Caller creates WebRTC SDP offer -> Callee responds with SDP answer via `call:offer` and `call:answer` events.
4. **ICE Candidates**: Both peers exchange ICE candidates over Socket.IO relay (`call:ice-candidate`).
5. **Call Session**: Direct peer-to-peer audio stream connected.
