# TicTacToe Live - Real-Time Multiplayer Setup

This is a real-time multiplayer Tic-Tac-Toe game built with React and Socket.io.

## Features

- ✅ Real-time multiplayer gameplay
- ✅ Room-based matchmaking (create/join rooms)
- ✅ Live chat during games
- ✅ Match history tracking
- ✅ Turn-based gameplay with proper synchronization
Good overall performance

## Installation

1. Install all the dependencies:
```bash
npm install
```

## Running the Application

### Option 1: Run Both Frontend and Backend Together (Recommended)
```bash
npm run dev
```
This will start:
- Backend server on `http://localhost:3001`
- React frontend on `http://localhost:3000`

### Option 2: Run Separately

**Terminal 1 - Backend:**
```bash
npm run server
```

**Terminal 2 - Frontend:**
```bash
npm start
```

## How to Play

1. **Login**: Enter any username and password (authentication is simplified for demo)
2. **Create a Room**: Click "Create New Room" to start a new game
3. **Share Room ID**: Copy the room ID and share it with a friend
4. **Join Room**: Your friend enters the room ID and clicks "Join Game"
5. **Play**: Take turns making moves - the game synchronizes and works real-time!

## Architecture

- **Frontend**: React with Socket.io Client
- **Backend**: Node.js + Express + Socket.io Server
- **Real-time Communication**: WebSocket via Socket.io

## Environment Variables

You can customize the Socket.io server URL by creating a `.env` file:
```
REACT_APP_SOCKET_URL=http://localhost:3001
```

For production, update this to your deployed backend URL.

## Notes

- The game supports 2 players per room
- Rooms are automatically cleaned up when empty
- Match history is stored locally in the browser
- The backend server manages all game state and synchronization

