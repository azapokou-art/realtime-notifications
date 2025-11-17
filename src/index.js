import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { redisPubSub } from './infrastructure/redis/RedisPubSub.js';
import client from 'prom-client';

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ timeout: 5000 });
dotenv.config();
const notificationsCounter = new client.Counter({
  name: 'notifications_total',
  help: 'Total de notificações enviadas',
  labelNames: ['type', 'priority']
});

import { mongoDBConnection } from './infrastructure/database/mongodb/MongoDBConnection.js';
import { SocketioService } from './infrastructure/websocket/SocketioService.js';

import { MongoNotificationRepository } from './infrastructure/database/mongodb/repositories/MongoNotificationRepository.js';
import { SendNotificationUseCase } from './application/use-cases/SendNotification.js';

class Application {
  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.port = process.env.PORT || 3000;
    
    this.redisPubSub = redisPubSub;
    this.websocketService = new SocketioService();
    this.notificationRepository = new MongoNotificationRepository();
    
    this.setupMiddlewares();
    this.setupRoutes();
    this.setupWebSocket();
  }

  setupMiddlewares() {
 
  this.app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.socket.io"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "ws:", "wss:", "http://localhost:3000", "https://cdn.socket.io"]
      },
    },
    crossOriginEmbedderPolicy: false
  }));

  this.app.get('/metrics', async (req, res) => {
    try {
      res.set('Content-Type', client.register.contentType);
      const metrics = await client.register.metrics();
      res.end(metrics);
    } catch (error) {
      res.status(500).end(error);
    }
  });
  
  this.app.use(cors());
  this.app.use(express.json());

  this.app.use(express.static('public'));

  this.app.get('/health', (req, res) => {
    res.json({ 
      status: 'OK', 
      timestamp: new Date().toISOString(),
      service: 'Realtime Notifications API'
    });
  });

  this.app.get('/', (req, res) => {
    res.sendFile(process.cwd() + '/public/index.html');
  });
}

  setupRoutes() {

    this.app.post('/notifications', async (req, res) => {
      try {
        const { message, type, recipient, priority } = req.body;
        
        const useCase = new SendNotificationUseCase(
          this.notificationRepository,
          this.websocketService,
          this.redisPubSub
        );

        const result = await useCase.execute({
          message,
          type,
          recipient,
          priority
        });

         if (result.success) {
           notificationsCounter.inc({ type: type, priority: priority });
  console.log('Métrica incrementada:', type, priority);
}

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('Erro ao enviar notificacao:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor'
    });
  }
});

    this.app.get('/notifications/:recipient', async (req, res) => {
      try {
        const { recipient } = req.params;
        const { limit = 20, offset = 0 } = req.query;

        const notifications = await this.notificationRepository.findByRecipient(
          recipient, 
          { limit: parseInt(limit), offset: parseInt(offset) }
        );

        res.json({
          success: true,
          data: notifications.map(notification => notification.toJSON()),
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset)
          }
        });
      } catch (error) {
        console.error('Erro ao buscar notificacoes:', error);
        res.status(500).json({
          success: false,
          error: 'Erro interno do servidor'
        });
      }
    });
  }

  setupWebSocket() {
    this.websocketService.initialize(this.server);
  }

  async start() {
    try {

      await mongoDBConnection.connect(process.env.MONGODB_URL);
      await this.redisPubSub.connect(process.env.REDIS_URL);

      await this.setupRedisSubscribers();

      this.server.listen(this.port, () => {
        console.log(`Servidor rodando na porta ${this.port}`);
        console.log(`Health check disponivel em: http://localhost:${this.port}/health`);
        console.log(`WebSocket inicializado`);
        console.log(`Redis Pub/Sub conectado`);
      });
    } catch (error) {
      console.error('Falha ao iniciar aplicacao:', error);
      process.exit(1);
    }
  }

  async stop() {
    try {
      await mongoDBConnection.disconnect();
      this.server.close();
      console.log('Aplicacao encerrada');
    } catch (error) {
      console.error('Erro ao encerrar aplicacao:', error);
    }
  }

async setupRedisSubscribers() {
  await this.redisPubSub.subscribe('notifications:global', (message) => {
    console.log('Notificacao global recebida:', message);
    this.websocketService.broadcast('notification:global', message);
  });

  await this.redisPubSub.subscribe('notifications:user:*', (message, channel) => {
    const userId = channel.split(':')[2];
    console.log(`Notificacao para usuario ${userId}:`, message);
    this.websocketService.sendToUser(userId, 'notification:personal', message);
  });
}
}


const application = new Application();

process.on('SIGINT', async () => {
  console.log('Recebido SIGINT, encerrando aplicacao...');
  await application.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Recebido SIGTERM, encerrando aplicacao...');
  await application.stop();
  process.exit(0);
});

application.start().catch(error => {
  console.error('Falha critica ao iniciar aplicacao:', error);
  process.exit(1);
});