import { NotificationModel } from '../schemas/NotificationSchema.js';
import { Notification } from '../../../../domain/Notification.js';

export class MongoNotificationRepository {
  async save(notification) {
    try {
      const notificationData = {
        message: notification.message,
        type: notification.type.toString(),
        recipient: notification.recipient,
        priority: notification.priority.toString(),
        read: notification.read,
        expiresAt: notification.expiresAt,
        metadata: notification.metadata || {}
      };

      const savedDoc = await NotificationModel.create(notificationData);
      
      return this.toDomain(savedDoc.toJSON());
      
    } catch (error) {
      console.error('Erro ao salvar notificação no MongoDB:', error);
      throw new Error(`Falha ao salvar notificação: ${error.message}`);
    }
  }

  async findById(id) {
    try {
      const doc = await NotificationModel.findById(id);
      return doc ? this.toDomain(doc.toJSON()) : null;
    } catch (error) {
      console.error('Erro ao buscar notificação por ID:', error);
      throw new Error(`Falha ao buscar notificação: ${error.message}`);
    }
  }

  async findByRecipient(recipientId, options = {}) {
    try {
      const { limit = 50, offset = 0, read } = options;
      
      const query = { recipient: recipientId };
      if (read !== undefined) {
        query.read = read;
      }

      const docs = await NotificationModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit);

      return docs.map(doc => this.toDomain(doc.toJSON()));
      
    } catch (error) {
      console.error('Erro ao buscar notificações por destinatário:', error);
      throw new Error(`Falha ao buscar notificações: ${error.message}`);
    }
  }

  async update(id, updates) {
    try {
      const updatedDoc = await NotificationModel.findByIdAndUpdate(
        id,
        { ...updates, updatedAt: new Date() },
        { new: true, runValidators: true }
      );
      
      return updatedDoc ? this.toDomain(updatedDoc.toJSON()) : null;
      
    } catch (error) {
      console.error('Erro ao atualizar notificação:', error);
      throw new Error(`Falha ao atualizar notificação: ${error.message}`);
    }
  }

  async delete(id) {
    try {
      const result = await NotificationModel.findByIdAndDelete(id);
      return !!result;
    } catch (error) {
      console.error('Erro ao deletar notificação:', error);
      throw new Error(`Falha ao deletar notificação: ${error.message}`);
    }
  }

  async markAsRead(id) {
    return this.update(id, { read: true });
  }

  async markAsUnread(id) {
    return this.update(id, { read: false });
  }

  async getUnreadCount(recipientId) {
    try {
      return await NotificationModel.countDocuments({
        recipient: recipientId,
        read: false
      });
    } catch (error) {
      console.error('Erro ao contar notificações não lidas:', error);
      throw new Error(`Falha ao contar notificações: ${error.message}`);
    }
  }

  toDomain(document) {
    return new Notification({
      id: document.id,
      message: document.message,
      type: document.type,
      recipient: document.recipient,
      priority: document.priority,
      read: document.read,
      createdAt: document.createdAt,
      expiresAt: document.expiresAt,
      metadata: document.metadata
    });
  }
}