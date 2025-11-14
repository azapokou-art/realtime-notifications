export class NotificationRepository {
  async save(notification) {
    throw new Error('Método save não implementado');
  }

  async findById(id) {
    throw new Error('Método findById não implementado');
  }

  async findByRecipient(recipientId, options = {}) {
    throw new Error('Método findByRecipient não implementado');
  }

  async update(id, updates) {
    throw new Error('Método update não implementado');
  }

  async delete(id) {
    throw new Error('Método delete não implementado');
  }

  async markAsRead(id) {
    throw new Error('Método markAsRead não implementado');
  }

  async markAsUnread(id) {
    throw new Error('Método markAsUnread não implementado');
  }

  async getUnreadCount(recipientId) {
    throw new Error('Método getUnreadCount não implementado');
  }
}