import { Notification } from '../../domain/Notification.js';

export class SendNotificationUseCase {
  constructor(notificationRepository, websocketService, redisPubSub) {
    if (!notificationRepository || !websocketService || !redisPubSub) {
      throw new Error('NotificationRepository, WebSocketService e RedisPubSub são obrigatórios');
    }
    
    this.notificationRepository = notificationRepository;
    this.websocketService = websocketService;
    this.redisPubSub = redisPubSub;
  }

  async execute({ message, type, recipient, priority = 'NORMAL', options = {} }) {
    try {
      
      this.validateInput({ message, type, recipient, priority });

      
      const notification = new Notification({
        message: message.trim(),
        type,
        recipient,
        priority,
        ...options
      });

      
      const savedNotification = await this.notificationRepository.save(notification);

     
      if (await this.websocketService.isUserConnected(recipient)) {
        await this.websocketService.broadcastToUser(
          recipient, 
          'notification:new',
          savedNotification.toJSON()
        );
      }

     
      await this.redisPubSub.publish('notifications:user:' + recipient, {
        type: 'NEW_NOTIFICATION',
        notification: savedNotification.toJSON(),
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        notification: savedNotification.toJSON(),
        message: 'Notificação enviada com sucesso'
      };

    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      
      return {
        success: false,
        error: error.message,
        notification: null
      };
    }
  }

  validateInput({ message, type, recipient, priority }) {
    if (!message || message.trim().length === 0) {
      throw new Error('Mensagem é obrigatória');
    }

    if (!type) {
      throw new Error('Tipo da notificação é obrigatório');
    }

    if (!recipient) {
      throw new Error('Destinatário é obrigatório');
    }

    if (message.length > 500) {
      throw new Error('Mensagem muito longa (máximo 500 caracteres)');
    }
  }
}