import mongoose from 'mongoose';

export class MongoDBConnection {
  constructor() {
    this.isConnected = false;
    this.connection = null;
  }

  async connect(url) {
    try {
      if (this.isConnected) {
        console.log('MongoDB já está conectado');
        return this.connection;
      }

      console.log('Conectando ao MongoDB...');

      mongoose.set('strictQuery', true);

      const options = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      };

      this.connection = await mongoose.connect(url, options);
      this.isConnected = true;

      mongoose.connection.on('error', (error) => {
        console.error('Erro na conexão MongoDB:', error);
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        console.log('MongoDB desconectado');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        console.log('MongoDB reconectado');
        this.isConnected = true;
      });

      console.log('MongoDB conectado com sucesso!');
      return this.connection;

    } catch (error) {
      console.error('Falha ao conectar com MongoDB:', error.message);
      throw new Error(`Não foi possível conectar ao MongoDB: ${error.message}`);
    }
  }

  async disconnect() {
    try {
      if (this.isConnected && mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
        this.isConnected = false;
        this.connection = null;
        console.log('MongoDB desconectado com sucesso');
      }
    } catch (error) {
      console.error('Erro ao desconectar MongoDB:', error);
      throw error;
    }
  }

  getConnection() {
    return this.connection;
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection?.host || 'N/A',
      name: mongoose.connection?.name || 'N/A'
    };
  }

  async healthCheck() {
    try {
      if (!this.isConnected) {
        return { healthy: false, error: 'Não conectado' };
      }

      await mongoose.connection.db.admin().ping();
      return { healthy: true, details: this.getStatus() };

    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }
}

export const mongoDBConnection = new MongoDBConnection();