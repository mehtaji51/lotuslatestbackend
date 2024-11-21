const WebSocket = require('ws');

let wss;

// Message queues for undelivered notifications
const messageQueue = new Map();

function setupWebSocketServer(server) {
  wss = new WebSocket.Server({ server });

  wss.on('connection', (ws) => {
    console.log('New WebSocket connection');

    // Mark the client as alive
    ws.isAlive = true;

    ws.id = generateUniqueId();
    messageQueue.set(ws.id, []); // Initialize a message queue for the client

    // Listen for incoming messages
    ws.on('message', (message) => {
      console.log('Received:', message);
    });

    // Handle client disconnection
    ws.on('close', () => {
      console.log('Client disconnected');
      messageQueue.delete(ws.id); // Clean up the message queue
    });

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    deliverQueuedMessages(ws);
  });

  // Periodically ping clients and remove stale connections
  setInterval(() => {
    wss.clients.forEach((client) => {
      if (!client.isAlive) {
        console.log('Terminating stale connection');
        messageQueue.delete(client.id); // Clean up the message queue
        return client.terminate();
      }
      client.isAlive = false;
      client.ping(); // Send a ping frame
    });
  }, 30000); // Ping every 30 seconds
}

function broadcastNotification(notification) {
  if (!wss) return;

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(notification));
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
    } else {
      if (messageQueue.has(client.id)) {
        messageQueue.get(client.id).push(notification);
      }
    }
  });
}

function deliverQueuedMessages(ws) {
  if (messageQueue.has(ws.id)) {
    const queuedMessages = messageQueue.get(ws.id);
    queuedMessages.forEach((message) => {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to deliver queued message:', error);
      }
    });
    messageQueue.set(ws.id, []); // Clear the queue after delivering messages
  }
}

function generateUniqueId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

module.exports = { setupWebSocketServer, broadcastNotification };
