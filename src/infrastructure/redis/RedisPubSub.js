import Redis from 'ioredis';

export class RedisPubSub {
  constructor() {
    this.publisher = null;
    this.subscriber = null;
    this.subscriptions = new Map(); 
  }

  async connect(url = 'redis://localhost:6379') {
    try {
      
      this.publisher = new Redis(url);
      this.subscriber = new Redis(url);

      
      this.setupEventListeners();

      console.log('Redis Pub/Sub conectado com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao conectar Redis Pub/Sub:', error);
      throw error;
    }
  }

  setupEventListeners() {
    this.publisher.on('error', (error) => {
      console.error('Erro no publisher Redis:', error);
    });

    this.subscriber.on('error', (error) => {
      console.error('Erro no subscriber Redis:', error);
    });

    this.subscriber.on('message', (channel, message) => {
      this.handleMessage(channel, message);
    });
  }

  async publish(channel, message) {
    try {
      if (!this.publisher) {
        throw new Error('Publisher não conectado');
      }

      const messageString = typeof message === 'string' 
        ? message 
        : JSON.stringify(message);

      const result = await this.publisher.publish(channel, messageString);
      console.log(`Mensagem publicada no canal ${channel}:`, message);

      return result;
    } catch (error) {
      console.error(`Erro ao publicar no canal ${channel}:`, error);
      throw error;
    }
  }

  async subscribe(channel, callback) {
    try {
      if (!this.subscriber) {
        throw new Error('Subscriber não conectado');
      }

      await this.subscriber.subscribe(channel);
      this.subscriptions.set(channel, callback);

      console.log(`Inscrito no canal ${channel}`);
      return true;
    } catch (error) {
      console.error(`Erro ao subscrever no canal ${channel}:`, error);
      throw error;
    }
  }

  async unsubscribe(channel) {
    try {
      if (!this.subscriber) {
        throw new Error('Subscriber não conectado');
      }

      await this.subscriber.unsubscribe(channel);
      this.subscriptions.delete(channel);

      console.log(`Inscrição cancelada do canal ${channel}`);
      return true;
    } catch (error) {
      console.error(`Erro ao cancelar inscrição do canal ${channel}:`, error);
      throw error;
    }
  }

  handleMessage(channel, message) {
    try {
      const callback = this.subscriptions.get(channel);
      if (callback) {
        let parsedMessage = message;
   
        try {
          parsedMessage = JSON.parse(message);
        } catch {
          
        }

        callback(parsedMessage, channel);
      }
    } catch (error) {
      console.error(`Erro ao processar mensagem do canal ${channel}:`, error);
    }
  }

  async disconnect() {
    try {
      if (this.publisher) {
        await this.publisher.quit();
      }
      if (this.subscriber) {
        await this.subscriber.quit();
      }
      
      this.subscriptions.clear();
      console.log('Conexões Redis Pub/Sub fechadas');
    } catch (error) {
      console.error('Erro ao fechar conexões Redis:', error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      if (!this.publisher || !this.subscriber) {
        return { healthy: false, error: 'Não conectado' };
      }

      await this.publisher.ping();

      await this.subscriber.ping();

      return { 
        healthy: true, 
        details: {
          publisher: this.publisher.status,
          subscriber: this.subscriber.status,
          subscriptions: Array.from(this.subscriptions.keys())
        }
      };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }
}

export const redisPubSub = new RedisPubSub();