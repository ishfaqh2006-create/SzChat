# SzChat API & Socket.IO Specification

## REST API Endpoints

### 1. Authentication (`/api/auth`)
- `POST /api/auth/register` — Register new user account.
- `POST /api/auth/login` — Authenticate user and receive JWT.
- `GET /api/auth/me` — Retrieve current authenticated user profile.
- `PUT /api/auth/profile` — Update user display name, avatar, or status message.

### 2. User Management (`/api/users`)
- `GET /api/users/search?q=:query` — Search users by username or display name.

### 3. Chats (`/api/chats`)
- `GET /api/chats` — Fetch all active direct & group chats for user.
- `POST /api/chats/direct` — Start or retrieve a direct message chat with a user.
- `POST /api/chats/group` — Create a new group chat.
- `GET /api/chats/:id` — Get chat metadata and member details.
- `GET /api/chats/:id/messages` — Paginated message history.
- `POST /api/chats/:id/read` — Mark all messages in chat as read.
- `POST /api/chats/:id/pin` — Toggle chat pinned state.
- `POST /api/chats/:id/archive` — Toggle chat archived state.
- `POST /api/chats/:id/members` — Add member to group chat.
- `DELETE /api/chats/:id/members/:userId` — Remove member from group chat.

### 4. Messages (`/api/messages`)
- `PUT /api/messages/:id` — Edit message content.
- `POST /api/messages/:id/delete-me` — Hide message for current user.
- `POST /api/messages/:id/delete-everyone` — Delete message for all participants.

### 5. Call Logs (`/api/calls`)
- `GET /api/calls/history` — Get user's recent WebRTC call logs.

---

## Socket.IO Realtime Events

### Connection & Presence
- `connection` (Client -> Server): Auth header containing JWT token.
- `presence:update` (Server -> Client): Broadcasts user online/offline status.

### Chat & Messaging
- `typing:start` / `typing:stop` (Client -> Server -> Client): Realtime typing indicators.
- `message:send` (Client -> Server): Sends chat message.
- `message:new` (Server -> Client): Delivers new message to chat room.
- `message:status` (Server -> Client): Updates message delivery/read state.

### WebRTC Signaling
- `call:initiate` (Client -> Server)
- `call:incoming` (Server -> Target Client)
- `call:accept` (Client -> Server)
- `call:accepted` (Server -> Caller Client)
- `call:reject` (Client -> Server)
- `call:rejected` (Server -> Caller Client)
- `call:offer` / `call:answer` (Client <-> Server <-> Client): WebRTC SDP description exchange.
- `call:ice-candidate` (Client <-> Server <-> Client): WebRTC ICE candidate exchange.
- `call:end` (Client -> Server)
