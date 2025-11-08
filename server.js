const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Environment variables
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const CLIENT_URL = process.env.CLIENT_URL || (NODE_ENV === 'production' ? '*' : 'http://localhost:3000');

// Configure CORS for Socket.io
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL === '*' ? true : CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true
  }
});

// CORS middleware
app.use(cors({
  origin: CLIENT_URL === '*' ? true : CLIENT_URL,
  credentials: true
}));

app.use(express.json());

// Serve static files from React app in production
if (NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'build')));
  
  // Serve React app for all routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
  });
}

// Store active rooms and games
const rooms = new Map();
const games = new Map();

// Helper function to calculate winner
const calculateWinner = (squares) => {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];
  for (let line of lines) {
    const [a, b, c] = line;
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return { winner: squares[a], line };
    }
  }
  return null;
};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Create a new room
  socket.on('createRoom', ({ username, roomId }) => {
    const room = {
      id: roomId,
      players: [{ id: socket.id, username, symbol: 'X' }],
      creator: username,
      status: 'waiting'
    };
    
    rooms.set(roomId, room);
    socket.join(roomId);
    socket.emit('roomCreated', room);
    console.log(`Room ${roomId} created by ${username}`);
  });

  // Join an existing room
  socket.on('joinRoom', ({ username, roomId }) => {
    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit('roomError', { message: 'Room not found' });
      return;
    }

    if (room.players.length >= 2) {
      socket.emit('roomError', { message: 'Room is full' });
      return;
    }

    // Add second player
    room.players.push({ id: socket.id, username, symbol: 'O' });
    room.status = 'playing';
    
    socket.join(roomId);
    
    // Initialize game state
    const gameState = {
      board: Array(9).fill(null),
      isXNext: true,
      currentPlayer: 'X'
    };
    games.set(roomId, gameState);

    // Notify both players
    io.to(roomId).emit('roomJoined', room);
    io.to(roomId).emit('gameState', gameState);
    io.to(roomId).emit('gameMessage', {
      type: 'system',
      text: `${username} joined the game! Game started. X goes first.`
    });
    
    console.log(`${username} joined room ${roomId}`);
  });

  // Handle game move
  socket.on('makeMove', ({ roomId, index }) => {
    const gameState = games.get(roomId);
    const room = rooms.get(roomId);
    
    if (!gameState || !room) {
      socket.emit('moveError', { message: 'Game not found' });
      return;
    }

    // Find the player making the move
    const player = room.players.find(p => p.id === socket.id);
    if (!player) {
      socket.emit('moveError', { message: 'You are not in this room' });
      return;
    }

    // Check if it's the player's turn
    const expectedSymbol = gameState.isXNext ? 'X' : 'O';
    if (player.symbol !== expectedSymbol) {
      socket.emit('moveError', { message: 'Not your turn' });
      return;
    }

    // Check if cell is already filled or game is over
    if (gameState.board[index] || calculateWinner(gameState.board)) {
      socket.emit('moveError', { message: 'Invalid move' });
      return;
    }

    // Make the move
    const newBoard = [...gameState.board];
    newBoard[index] = player.symbol;
    gameState.board = newBoard;
    gameState.isXNext = !gameState.isXNext;
    gameState.currentPlayer = gameState.isXNext ? 'X' : 'O';

    // Check for winner or draw
    const result = calculateWinner(newBoard);
    if (result) {
      const winner = room.players.find(p => p.symbol === result.winner);
      gameState.winner = winner.username;
      gameState.winningLine = result.line;
      
      io.to(roomId).emit('gameState', gameState);
      io.to(roomId).emit('gameMessage', {
        type: 'system',
        text: `🎉 ${winner.username} wins!`
      });
    } else if (newBoard.every(cell => cell !== null)) {
      gameState.winner = 'Draw';
      io.to(roomId).emit('gameState', gameState);
      io.to(roomId).emit('gameMessage', {
        type: 'system',
        text: "It's a draw!"
      });
    } else {
      // Broadcast updated game state
      io.to(roomId).emit('gameState', gameState);
    }
  });

  // Handle chat messages
  socket.on('sendMessage', ({ roomId, username, text }) => {
    io.to(roomId).emit('gameMessage', {
      type: 'user',
      username,
      text
    });
  });

  // Reset game
  socket.on('resetGame', ({ roomId }) => {
    const gameState = games.get(roomId);
    if (gameState) {
      gameState.board = Array(9).fill(null);
      gameState.isXNext = true;
      gameState.currentPlayer = 'X';
      gameState.winner = null;
      gameState.winningLine = null;
      
      io.to(roomId).emit('gameState', gameState);
      io.to(roomId).emit('gameMessage', {
        type: 'system',
        text: 'New game started! X goes first.'
      });
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Find and clean up rooms
    for (const [roomId, room] of rooms.entries()) {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        const player = room.players[playerIndex];
        room.players.splice(playerIndex, 1);
        
        // Notify other players
        socket.to(roomId).emit('gameMessage', {
          type: 'system',
          text: `${player.username} left the game`
        });
        
        // Clean up if room is empty
        if (room.players.length === 0) {
          rooms.delete(roomId);
          games.delete(roomId);
        } else {
          // Update room status if only one player left
          room.status = 'waiting';
        }
        break;
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${NODE_ENV}`);
  if (NODE_ENV === 'production') {
    console.log('Serving React app from /build directory');
  }
});

