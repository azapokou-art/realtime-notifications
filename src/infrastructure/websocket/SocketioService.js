import { Server } from 'socket.io';

export class SocketioService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map();
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.WEBSOCKET_CORS_ORIGIN || "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });

    this.setupEventHandlers();
    console.log('WebSocket Service inicializado');
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Cliente conectado: ${socket.id}`);

      socket.on('user:identify', (userId) => {
        this.registerUserConnection(userId, socket.id);
        socket.join(`user:${userId}`);
        console.log(`Usuário ${userId} identificado com socket ${socket.id}`);
      });

      socket.on('room:join', (roomId) => {
        socket.join(roomId);
        console.log(`Socket ${socket.id} entrou na sala ${roomId}`);
      });

      socket.on('room:leave', (roomId) => {
        socket.leave(roomId);
        console.log(`Socket ${socket.id} saiu da sala ${roomId}`);
      });

      socket.on('disconnect', () => {
        this.removeUserConnection(socket.id);
        console.log(`Cliente desconectado: ${socket.id}`);
      });
    });
  }

  registerUserConnection(userId, socketId) {
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }
    this.connectedUsers.get(userId).add(socketId);
  }

  removeUserConnection(socketId) {
    for (const [userId, socketIds] of this.connectedUsers.entries()) {
      if (socketIds.has(socketId)) {
        socketIds.delete(socketId);
        if (socketIds.size === 0) {
          this.connectedUsers.delete(userId);
        }
        break;
      }
    }
  }

  async sendToUser(userId, event, data) {
    try {
      this.io.to(`user:${userId}`).emit(event, data);
      console.log(`Mensagem enviada para usuário ${userId}: ${event}`);
      return true;
    } catch (error) {
      console.error(`Erro ao enviar para usuário ${userId}:`, error);
      return false;
    }
  }

  async broadcast(event, data) {
    try {
      this.io.emit(event, data);
      console.log(`Broadcast enviado: ${event}`);
      return true;
    } catch (error) {
      console.error('Erro no broadcast:', error);
      return false;
    }
  }

  async broadcastToRoom(roomId, event, data) {
    try {
      this.io.to(roomId).emit(event, data);
      console.log(`Mensagem enviada para sala ${roomId}: ${event}`);
      return true;
    } catch (error) {
      console.error(`Erro ao enviar para sala ${roomId}:`, error);
      return false;
    }
  }

  async broadcastToUser(userId, event, data) {
    return this.sendToUser(userId, event, data);
  }

  async joinRoom(userId, roomId) {
    const userSockets = this.connectedUsers.get(userId);
    if (userSockets) {
      userSockets.forEach(socketId => {
        this.io.sockets.sockets.get(socketId)?.join(roomId);
      });
    }
  }

  async leaveRoom(userId, roomId) {
    const userSockets = this.connectedUsers.get(userId);
    if (userSockets) {
      userSockets.forEach(socketId => {
        this.io.sockets.sockets.get(socketId)?.leave(roomId);
      });
    }
  }

  async isUserConnected(userId) {
    return this.connectedUsers.has(userId) && this.connectedUsers.get(userId).size > 0;
  }

  async getConnectedUsers() {
    return Array.from(this.connectedUsers.keys());
  }

  getSocketInstance() {
    return this.io;
  }
}