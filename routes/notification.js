const express = require('express');
const logger = require('../logger');
const Notification = require('../../backend/models/Notification')
const {broadcastNotification} = require('../websocket')

const router = express.Router();

/*
const {
  handleNotificationTrigger,
} = require('../notification-microservice/notification-microservice');

// Triggering Notification
router.post('/trigger-notification', (req, res) => {
  // TODO: Validate the request body

  // the request body should contain the data needed to trigger a notification
  handleNotificationTrigger(req.body)
    .then(() => {
      res.json({ message: 'Notification triggered successfully' });
    })
    .catch((error) => {
      res
        .status(500)
        .json({ error: 'Error triggering notification', details: error });
    });
});
*/

// POST route to save notification data
router.post('/save-notification', async (req, res) => {
  try {
    
    const notifications = Array.isArray(req.body) ? req.body : [req.body]; // Ensure we have an array
    logger.debug(notifications);
    // Create an array to hold all save promises
    const savePromises = notifications.map(notificationData => {
      // Create a new Notification instance with data from notificationData
      const newNotification = new Notification({
        userId: notificationData.userId,
        courseId: notificationData.courseId,
        type: notificationData.type,
        payload: notificationData.payload,
        senderName:notificationData.senderName,
        status: notificationData.status || 'unread',  // Default to 'unread'
        retryCount: 0,
        maxRetryAttempts: 3
      });
      return newNotification.save(); // Return the promise from save operation
    });

    // Wait for all notifications to be saved
    const savedNotifications = await Promise.all(savePromises);
    savedNotifications.forEach(notification => 
      broadcastNotification({ action: 'new', notification })
    );
    logger.debug(savedNotifications);

    // Send a success response
    res.status(201).json({
      message: 'Notifications saved successfully',
      savedNotifications
    });
  } catch (error) {
    // Handle any errors that occur during the save
    res.status(500).json({ error: 'Failed to save notifications', details: error });
  }
});


router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    // Find all notifications that match the given userId
    const notifications = await Notification.find({ userId: userId }).sort({ createdAt: -1 });

    // Return the found notifications
    res.status(200).json(notifications);
  } catch (error) {
    // Handle any errors that occur during retrieval
    res.status(500).json({ error: 'Failed to fetch notifications', details: error });
  }
});


router.put('/mark-as-read', async (req, res) => {
  const { notificationIds } = req.body; // Expect `notificationIds` to be a single ID or an array of IDs

  if (!notificationIds || (Array.isArray(notificationIds) && notificationIds.length === 0)) {
    return res.status(400).json({ error: 'No notificationId(s) provided for update' });
  }

  try {
    // If `notificationIds` is an array, perform a bulk update; otherwise, update a single notification
    const updateResult = Array.isArray(notificationIds)
      ? await Notification.updateMany({ _id: { $in: notificationIds } }, { status: 'read' }, { new: true })
      : await Notification.findByIdAndUpdate(notificationIds, { status: 'read' }, { new: true });

    // Check if any notifications were updated
    const updatedNotifications = Array.isArray(notificationIds)
      ? await Notification.find({ _id: { $in: notificationIds }, status: 'read' })
      : [updateResult].filter(Boolean); // Ensure the result is an array

    if (updatedNotifications.length === 0) {
      return res.status(404).json({ error: 'Notification(s) not found' });
    }

    broadcastNotification({
      action: 'update',
      notificationIds: Array.isArray(notificationIds) ? notificationIds : [notificationIds],
    });

    res.status(200).json({
      message: 'Notification(s) marked as read successfully',
      updatedNotifications,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notification status', details: error });
  }
});

router.delete('/delete-notification', async (req, res) => {
  try {
    const { notificationIds } = req.body; // Expect `notificationIds` to be a single ID or an array of IDs
    logger.debug(notificationIds);
    if (!notificationIds || (Array.isArray(notificationIds) && notificationIds.length === 0)) {
      return res.status(400).json({ error: 'No notificationId(s) provided for deletion' });
    }

    // If `notificationIds` is an array, perform a bulk delete; otherwise, delete a single notification
    const deleteResult = Array.isArray(notificationIds)
      ? await Notification.deleteMany({ _id: { $in: notificationIds } })
      : await Notification.findByIdAndDelete(notificationIds);
  
    // Check if any notifications were deleted
    if ((deleteResult.deletedCount === 0) || !deleteResult) {
      return res.status(404).json({ error: 'Notification(s) not found' });
    }

    broadcastNotification({
      action: 'delete',
      notificationIds: Array.isArray(notificationIds) ? notificationIds : [notificationIds]
    });

   
    res.status(200).json({
      message: 'Notification(s) deleted successfully',
      deleteResult
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete notification(s)', details: error });
  }
});

module.exports = router;



