export class Notification {
  constructor({ id, message, type, recipient, priority = 'NORMAL', read = false, createdAt = new Date() }) {
    this.id = id;
    this.message = message;
    this.type = type;
    this.recipient = recipient;
    this.priority = priority;
    this.read = read;
    this.createdAt = createdAt;
    this.expiresAt = null;

    this.validate();
  }

  validate() {
    
    if (!this.message || this.message.trim().length === 0) {
      throw new Error('Mensagem da notificação é obrigatória');
    }

    if (!this.type) {
      throw new Error('Tipo da notificação é obrigatório');
    }

    if (!this.recipient) {
      throw new Error('Destinatário da notificação é obrigatório');
    }

    const validPriorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];
    if (!validPriorities.includes(this.priority)) {
      throw new Error('Prioridade da notificação é inválida');
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
    return this.type !== 'SYSTEM';
  }
}