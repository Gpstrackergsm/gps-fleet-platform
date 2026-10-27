import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { connectDB } from './db';
import app from './app';
import { startTcpServer } from './tcpServer';

const HTTP_PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;

// Initialize DB
connectDB();

// --- HTTP API & Real-time Server ---
const httpServer = http.createServer(app);
export const io = new SocketIOServer(httpServer, {
    cors: {
        origin: '*', // Allow all for MVP, restrict in prod
        methods: ['GET', 'POST']
    }
});

io.on('connection', (socket) => {
    console.log('[Socket] Client connected:', socket.id);
    socket.on('disconnect', () => console.log('[Socket] Client disconnected:', socket.id));
});

// Avoid circular dependency by attaching io to app
app.set('io', io);

// Start TCP Server
// Start TCP Server
startTcpServer(io);

httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
    console.log(`[HTTP] API & Socket Server running on 0.0.0.0:${HTTP_PORT}`);
});
