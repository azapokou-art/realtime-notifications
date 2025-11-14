export class WebSocketService {

  async sendToUser(userId, event, data) {
    throw new Error('Método sendToUser não implementado');
  }

  async broadcast(event, data) {
    throw new Error('Método broadcast não implementado');
  }

  async broadcastToRoom(roomId, event, data) {
    throw new Error('Método broadcastToRoom não implementado');
  }

  async broadcastToUser(userId, event, data) {
    throw new Error('Método broadcastToUser não implementado');
  }

  async joinRoom(userId, roomId) {
    throw new Error('Método joinRoom não implementado');
  }

  async leaveRoom(userId, roomId) {
    throw new Error('Método leaveRoom não implementado');
  }

  async isUserConnected(userId) {
    throw new Error('Método isUserConnected não implementado');
  }

  async getConnectedUsers() {
    throw new Error('Método getConnectedUsers não implementado');
  }
}