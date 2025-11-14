import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  message: {
    type: String,
    required: [true, 'Mensagem é obrigatória'],
    trim: true,
    maxlength: [500, 'Mensagem não pode ter mais de 500 caracteres']
  },
  type: {
    type: String,
    required: [true, 'Tipo é obrigatório'],
    enum: {
      values: ['SYSTEM', 'MESSAGE', 'ALERT', 'PROMOTION', 'SECURITY', 'REMINDER'],
      message: 'Tipo de notificação inválido'
    }
  },
  recipient: {
    type: String,
    required: [true, 'Destinatário é obrigatório'],
    index: true
  },
  priority: {
    type: String,
    required: true,
    enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
    default: 'NORMAL'
  },
  read: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    default: null
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL para expiração

export const NotificationModel = mongoose.model('Notification', notificationSchema);