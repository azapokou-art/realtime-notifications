import { NotificationType, NotificationPriority, NotificationTypes, NotificationPriorities } from './NotificationTypes.js';

export class Notification {
  constructor({ 
    id, 
    message, 
    type, 
    recipient, 
    priority = NotificationPriorities.NORMAL, 
    read = false, 
    createdAt = new Date() 
  }) {
    this.id = id;
    this.message = message;
    
    this.type = type instanceof NotificationType ? type : new NotificationType(type);
    this.priority = priority instanceof NotificationPriority ? priority : new NotificationPriority(priority);
    
    this.recipient = recipient;
    this.read = read;
    this.createdAt = createdAt;
    this.expiresAt = null;

    this.validate();
  }

  validate() {

    if (!this.message || this.message.trim().length === 0) {
      throw new Error('Mensagem da notificação é obrigatória');
    }

    if (!this.recipient) {
      throw new Error('Destinatário da notificação é obrigatório');
    }

  }

  markAsRead() {
    this.read = true;
    return this;
  }

  markAsUnread() {
    this.read = false;
    return this;
  }

  setExpiration(hours) {
    this.expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000);
    return this;
  }

  isExpired() {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }

  isDeletable() {
    return !this.type.equals(NotificationTypes.SYSTEM);
  }

  toJSON() {
    return {
      id: this.id,
      message: this.message,
      type: this.type.toString(),
      priority: this.priority.toString(),
      recipient: this.recipient,
      read: this.read,
      createdAt: this.createdAt,
      expiresAt: this.expiresAt
    };
  }
}