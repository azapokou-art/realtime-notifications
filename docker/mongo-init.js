db = db.getSiblingDB('notifications');

db.createUser({
  user: 'notifications_user',
  pwd: 'notifications_pass',
  roles: [
    {
      role: 'readWrite',
      db: 'notifications'
    }
  ]
});

db.createCollection('notifications');

db.notifications.createIndex({ "createdAt": -1 });
db.notifications.createIndex({ "recipient": 1, "createdAt": -1 });

print('MongoDB inicializado com sucesso!');
print('Database: notifications');
print('Usuário: notifications_user');
print('Collection: notifications criada');