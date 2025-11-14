export class NotificationType {
  constructor(value) {
    this.value = value;
    this.validate();
  }

  validate() {
    const validTypes = [
      'SYSTEM',
      'MESSAGE', 
      'ALERT',
      'PROMOTION',
      'SECURITY',
      'REMINDER'
    ];

    if (!validTypes.includes(this.value)) {
      throw new Error(`Tipo de notificação inválido: ${this.value}`);
    }
  }

  toString() {
    return this.value;
  }

  equals(other) {
    return other instanceof NotificationType && this.value === other.value;
  }
}

export class NotificationPriority {
  constructor(value) {
    this.value = value;
    this.validate();
  }

  validate() {
    const validPriorities = [
      'LOW',
      'NORMAL', 
      'HIGH',
      'URGENT'
    ];

    if (!validPriorities.includes(this.value)) {
      throw new Error(`Prioridade de notificação inválida: ${this.value}`);
    }
  }

  toString() {
    return this.value;
  }

  equals(other) {
    return other instanceof NotificationPriority && this.value === other.value;
  }
}

export const NotificationTypes = {
  SYSTEM: new NotificationType('SYSTEM'),
  MESSAGE: new NotificationType('MESSAGE'),
  ALERT: new NotificationType('ALERT'),
  PROMOTION: new NotificationType('PROMOTION'),
  SECURITY: new NotificationType('SECURITY'),
  REMINDER: new NotificationType('REMINDER')
};

export const NotificationPriorities = {
  LOW: new NotificationPriority('LOW'),
  NORMAL: new NotificationPriority('NORMAL'),
  HIGH: new NotificationPriority('HIGH'),
  URGENT: new NotificationPriority('URGENT')
};