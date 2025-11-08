import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, Users, Trophy, LogOut, Copy, Check, AlertCircle } from 'lucide-react';
import io from 'socket.io-client';

// Auto-detect socket URL: use environment variable, or current hostname in production, or localhost for dev
const getSocketURL = () => {
  // Always use current hostname in production (on Render)
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    const url = `https://${window.location.hostname}`;
    console.log('Auto-detected socket URL from hostname:', url);
    return url;
  }
  // Use environment variable if set (for local development with custom backend)
  if (process.env.REACT_APP_SOCKET_URL) {
    console.log('Using REACT_APP_SOCKET_URL:', process.env.REACT_APP_SOCKET_URL);
    return process.env.REACT_APP_SOCKET_URL;
  }
  // Development fallback
  console.log('Using development fallback: http://localhost:3001');
  return 'http://localhost:3001';
};

const SOCKET_URL = getSocketURL();
console.log('Connecting to Socket.io at:', SOCKET_URL);
console.log('Current hostname:', window.location.hostname);
console.log('Current URL:', window.location.href);

const TicTacToeGame = () => {
  const [screen, setScreen] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [roomId, setRoomId] = useState('');
  const [gameRoom, setGameRoom] = useState(null);
  const [board, setBoard] = useState(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [matchHistory, setMatchHistory] = useState([]);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [mySymbol, setMySymbol] = useState(null);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const chatEndRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      console.error('Attempted to connect to:', SOCKET_URL);
      setIsConnected(false);
      setError(`Failed to connect to server at ${SOCKET_URL}. Check if the backend is running.`);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  // Set up socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('roomCreated', (room) => {
      setGameRoom(room);
      setRoomId(room.id);
      setScreen('waiting');
      setMySymbol('X');
      setIsMyTurn(true);
      setError('');
    });

    socket.on('roomJoined', (room) => {
      setGameRoom(room);
      setScreen('game');
      const myPlayer = room.players.find(p => p.username === currentUser.username);
      if (myPlayer) {
        setMySymbol(myPlayer.symbol);
        setIsMyTurn(myPlayer.symbol === 'X');
      }
      setError('');
    });

    socket.on('roomError', ({ message }) => {
      setError(message);
      setTimeout(() => setError(''), 5000);
    });

    socket.on('gameState', (gameState) => {
      setBoard(gameState.board);
      setIsXNext(gameState.isXNext);
      setIsMyTurn(gameState.currentPlayer === mySymbol);
      
      if (gameState.winner) {
        if (gameState.winner !== 'Draw') {
          const match = {
            date: new Date().toLocaleString(),
            winner: gameState.winner,
            players: gameRoom?.players.map(p => p.username).join(' vs ') || ''
          };
          setMatchHistory([match, ...matchHistory]);
        }
      }
    });

    socket.on('gameMessage', (message) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('moveError', ({ message }) => {
      setError(message);
      setTimeout(() => setError(''), 3000);
    });

    return () => {
      socket.off('roomCreated');
      socket.off('roomJoined');
      socket.off('roomError');
      socket.off('gameState');
      socket.off('gameMessage');
      socket.off('moveError');
    };
  }, [socket, currentUser, mySymbol, gameRoom, matchHistory]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleLogin = (e) => {
    if (username.trim() && password.trim()) {
      setCurrentUser({ username, password });
      setScreen('lobby');
      setError('');
    }
  };

  const createRoom = () => {
    if (!socket || !isConnected) {
      setError('Not connected to server. Please make sure the backend is running on port 3001.');
      return;
    }
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    socket.emit('createRoom', { username: currentUser.username, roomId: newRoomId });
  };

  const joinRoom = () => {
    if (!socket || !isConnected) {
      setError('Not connected to server. Please make sure the backend is running on port 3001.');
      return;
    }
    if (!roomId.trim()) {
      setError('Please enter a room ID');
      return;
    }
    socket.emit('joinRoom', { username: currentUser.username, roomId: roomId.trim().toUpperCase() });
  };

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

  const handleClick = (index) => {
    if (!socket || !roomId || !isMyTurn) return;
    if (board[index] || calculateWinner(board)) return;
    
    socket.emit('makeMove', { roomId, index });
  };

  const sendMessage = () => {
    if (!socket || !roomId || !newMessage.trim()) return;
    socket.emit('sendMessage', { 
      roomId, 
      username: currentUser.username, 
      text: newMessage.trim() 
    });
    setNewMessage('');
  };

  const resetGame = () => {
    if (!socket || !roomId) return;
    socket.emit('resetGame', { roomId });
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const logout = () => {
    if (socket) {
      socket.disconnect();
    }
    setScreen('login');
    setCurrentUser(null);
    setGameRoom(null);
    setBoard(Array(9).fill(null));
    setMessages([]);
    setRoomId('');
    setMySymbol(null);
    setIsMyTurn(false);
    setError('');
    // Reconnect socket for next login
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);
  };

  const renderSquare = (index) => {
    const result = calculateWinner(board);
    const isWinningSquare = result?.line.includes(index);
    const isDisabled = !isMyTurn || board[index] || calculateWinner(board);
    
    return (
      <button
        className={`w-24 h-24 bg-white/90 backdrop-blur-sm border-2 border-indigo-300 rounded-xl text-4xl font-bold transition-all hover:bg-indigo-50 hover:scale-105 hover:shadow-lg ${
          isWinningSquare ? 'bg-green-200 animate-pulse' : ''
        } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''} ${board[index] === 'X' ? 'text-blue-600' : 'text-pink-600'}`}
        onClick={() => handleClick(index)}
        disabled={isDisabled}
      >
        {board[index]}
      </button>
    );
  };

  if (screen === 'login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-8 w-full max-w-md border-4 border-white/50">
          <div className="text-center mb-8">
            <h1 className="text-5xl font-extrabold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
              TicTacToe Live
            </h1>
            <p className="text-gray-600 text-lg">Challenge Friends in Real-Time!</p>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-gray-700 font-semibold mb-2 text-sm uppercase tracking-wide">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none transition-all text-lg"
                placeholder="Enter your username"
                required
              />
            </div>
            
            <div>
              <label className="block text-gray-700 font-semibold mb-2 text-sm uppercase tracking-wide">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none transition-all text-lg"
                placeholder="Enter your password"
                required
              />
            </div>
            
            <button
              onClick={handleLogin}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 rounded-xl font-bold text-lg hover:from-purple-700 hover:to-pink-700 transform hover:scale-105 transition-all shadow-lg"
            >
              Enter Game Lobby
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'lobby') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 text-black via-indigo-500 to-purple-600 p-4">
        <div className="max-w-4xl text-black mx-auto">
          <div className="bg-white/95 backdrop-blur-md rounded-3xl text-black shadow-2xl p-8 border-4 border-white/50">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-4xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Game Lobby
                </h1>
                <p className="text-gray-600 mt-1">Welcome, {currentUser.username}!</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-xs text-gray-500">
                    {isConnected ? 'Connected' : 'Disconnected - Start backend server (npm run server)'}
                  </span>
                </div>
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-red-100 border-2 border-red-400 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}
            
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gradient-to-br from-green-100 to-green-50 p-6 rounded-2xl border-2 border-green-300 shadow-lg">
                <h2 className="text-2xl font-bold text-green-800 mb-4 flex items-center gap-2">
                  <Users size={24} />
                  Create Room
                </h2>
                <p className="text-gray-700 mb-4">Start a new game and invite a friend!</p>
                <button
                  onClick={createRoom}
                  className="w-full bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transform hover:scale-105 transition-all shadow-md"
                >
                  Create New Room
                </button>
              </div>
              
              <div className="bg-gradient-to-br from-blue-100 to-blue-50 p-6 rounded-2xl border-2 border-blue-300 shadow-lg">
                <h2 className="text-2xl font-bold text-blue-800 mb-4 flex items-center gap-2">
                  <Users size={24} />
                  Join Room
                </h2>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none mb-4 text-lg font-mono"
                  placeholder="Enter Room ID"
                />
                <button
                  onClick={joinRoom}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transform hover:scale-105 transition-all shadow-md"
                >
                  Join Game
                </button>
              </div>
            </div>

            {matchHistory.length > 0 && (
              <div className="bg-gradient-to-br from-purple-100 to-purple-50 p-6 rounded-2xl border-2 border-purple-300 shadow-lg">
                <h2 className="text-2xl font-bold text-purple-800 mb-4 flex items-center gap-2">
                  <Trophy size={24} />
                  Match History
                </h2>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {matchHistory.map((match, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg shadow flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-gray-800">{match.players}</p>
                        <p className="text-sm text-gray-600">{match.date}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full font-bold ${
                        match.winner === 'Draw' ? 'bg-gray-300 text-gray-700' : 'bg-yellow-300 text-yellow-900'
                      }`}>
                        {match.winner === 'Draw' ? 'Draw' : `🏆 ${match.winner}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-500 to-pink-600 flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-8 w-full max-w-md text-center border-4 border-white/50">
          <div className="mb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse">
              <Users size={40} className="text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">Waiting for Opponent</h2>
            <p className="text-gray-600">Share the room ID with your friend</p>
          </div>
          
          <div className="bg-gradient-to-r from-purple-100 to-pink-100 p-6 rounded-2xl mb-6 border-2 border-purple-300">
            <p className="text-sm text-gray-600 mb-2 uppercase tracking-wide font-semibold">Room ID</p>
            <div className="flex items-center justify-center gap-2">
              <p className="text-4xl font-bold font-mono text-purple-700">{roomId}</p>
              <button
                onClick={copyRoomId}
                className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all"
              >
                {copied ? <Check size={20} /> : <Copy size={20} />}
              </button>
            </div>
          </div>
          
          <button
            onClick={() => setScreen('lobby')}
            className="text-gray-600 hover:text-gray-800 font-semibold"
          >
            ← Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'game') {
    const result = calculateWinner(board);
    const status = result
      ? `Winner: ${result.winner}`
      : board.every(cell => cell !== null)
      ? "It's a Draw!"
      : `Next Player: ${isXNext ? 'X' : 'O'}`;

    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-600 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-6 border-4 border-white/50">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-extrabold bg-gradient-to-r from-cyan-600 to-indigo-600 bg-clip-text text-transparent">
                  TicTacToe Live
                </h1>
                <p className="text-sm text-gray-600">Room: {gameRoom?.id}</p>
                {mySymbol && (
                  <p className="text-sm text-gray-600">You are: <span className="font-bold">{mySymbol}</span> {isMyTurn && '(Your turn!)'}</p>
                )}
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
              >
                <LogOut size={18} />
                Exit
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-red-100 border-2 border-red-400 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <div className="bg-gradient-to-br from-indigo-100 to-purple-100 p-6 rounded-2xl shadow-lg mb-4">
                  <div className="text-center mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">{status}</h2>
                    {!result && !board.every(cell => cell !== null) && (
                      <p className="text-sm text-gray-600 mt-1">
                        {isMyTurn ? '🎯 Your turn!' : '⏳ Waiting for opponent...'}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex justify-center mb-4">
                    <div className="grid grid-cols-3 gap-3 bg-white/50 p-4 rounded-2xl">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => renderSquare(i))}
                    </div>
                  </div>
                  
                  <div className="flex gap-4 justify-center">
                    <button
                      onClick={resetGame}
                      className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-xl font-bold hover:from-green-700 hover:to-green-600 transform hover:scale-105 transition-all shadow-md"
                    >
                      New Game
                    </button>
                    <button
                      onClick={() => {
                        setScreen('lobby');
                        setMessages([]);
                        setBoard(Array(9).fill(null));
                      }}
                      className="px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-500 text-white rounded-xl font-bold hover:from-gray-700 hover:to-gray-600 transform hover:scale-105 transition-all shadow-md"
                    >
                      Back to Lobby
                    </button>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-100 to-cyan-100 p-4 rounded-2xl shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users size={20} className="text-blue-700" />
                    <h3 className="font-bold text-blue-900">Players</h3>
                  </div>
                  <div className="flex gap-4">
                    {gameRoom?.players.map((player, idx) => (
                      <div key={idx} className={`bg-white px-4 py-2 rounded-lg shadow flex-1 ${
                        player.username === currentUser.username ? 'ring-2 ring-blue-500' : ''
                      }`}>
                        <p className="font-semibold text-gray-800">
                          {player.username} {player.username === currentUser.username && '(You)'}
                        </p>
                        <p className="text-2xl font-bold text-blue-600">{player.symbol}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-pink-100 to-rose-100 p-4 rounded-2xl shadow-lg flex flex-col h-[600px]">
                <div className="flex items-center gap-2 mb-4">
                  <MessageCircle size={20} className="text-pink-700" />
                  <h3 className="font-bold text-pink-900">Game Chat</h3>
                </div>
                
                <div className="flex-1 bg-white rounded-xl p-4 mb-4 overflow-y-auto space-y-2">
                  {messages.map((msg, idx) => (
                    <div key={idx} className={`${msg.type === 'system' ? 'text-center' : ''}`}>
                      {msg.type === 'system' ? (
                        <p className="text-sm text-gray-500 italic bg-gray-100 inline-block px-3 py-1 rounded-full">
                          {msg.text}
                        </p>
                      ) : (
                        <div className={`${msg.username === currentUser.username ? 'text-right' : 'text-left'}`}>
                          <div className={`inline-block px-4 py-2 rounded-2xl ${
                            msg.username === currentUser.username
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-300 text-gray-800'
                          }`}>
                            <p className="text-xs font-semibold mb-1 opacity-75">
                              {msg.username}
                            </p>
                            <p>{msg.text}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-pink-500 focus:outline-none"
                    placeholder="Type a message..."
                  />
                  <button
                    onClick={sendMessage}
                    className="px-6 py-3 bg-pink-600 text-white rounded-xl font-bold hover:bg-pink-700 transition-all shadow-md"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default TicTacToeGame;
