const mongoose = require('mongoose');

const notificationSchema = mongoose.Schema({
  userId: { type: String, required: true },
  courseId: String,
  type: { type: String, required: true }, // 'email', 'sms', 'push'
  payload: { type: Object, required: true },
  senderName:{type:String, required:true},
  status: { type: String, default: 'unread' }, // 'pending', 'delivered', 'failed'
  retryCount: { type: Number, default: 0 },
  maxRetryAttempts: { type: Number, default: 3 },
},
  { timestamps: true }
);


const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
