const express = require('express');
const http = require('http');
const cors = require('cors');
require('dotenv').config();

const apiRoutes = require('./routes/api');
const { setupWebSocket } = require('./websocket');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];
app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));
app.use(express.json());

// Routes
app.use('/api', apiRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create HTTP server
const server = http.createServer(app);

// Attach WebSocket
setupWebSocket(server);

// Start server
server.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════╗
  ║       🎮 GridWars Server Running      ║
  ║                                       ║
  ║   HTTP:  http://localhost:${PORT}        ║
  ║   WS:    ws://localhost:${PORT}          ║
  ╚═══════════════════════════════════════╝
  `);
});
