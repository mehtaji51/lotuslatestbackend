const express = require('express');
const cookieParser = require('cookie-parser');
const { graphqlHTTP } = require('express-graphql');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const config = require('./utils/config');
const WebSocket = require('ws'); 
const http = require('http');
const { setupWebSocketServer, broadcastNotification } = require('./websocket');
const graphqlSchema = require('./graphql/schema/schema');
const graphqlResolvers = require('./graphql/resolvers/resolvers');
const isAuth = require('./middleware/is-auth');
 const notificationRoutes = require('./routes/notification');
const { connectToDatabases } = require('./db/connection');
// const processNotifications = require('./notification-microservice/worker-service');

const buildPath = '/var/www/Lotus-Learning-WebApp/frontend/build';

const app = express();
app.use(express.static(buildPath));
const server = http.createServer(app); // Create an HTTP server


// Force JavaScript content type
app.use('/static/js', (req, res, next) => {
  res.setHeader('Content-Type', 'application/javascript');
  next();
});

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));


const corsOptions = {
  origin: 'http://localhost:3000',
  credentials: true,
};



// Apply CORS middleware globally before routes
app.use(cors(corsOptions));


const logger = require('./logger');
const pino = require('pino-http')({

  logger,
});
app.use(pino);
app.use(cookieParser());
app.use(isAuth);


 app.use('/api', notificationRoutes);

// app.use(
//   '/graphql',
//   graphqlHTTP({
//     schema: graphqlSchema,
//     rootValue: graphqlResolvers,
//     graphiql: true,
//   })
// );

//COOKIES
const cookeHandler = require('./middleware/cookie-handler');
app.use('/cookies', cookeHandler);

// ROUTES
const userRoutes = require('./routes/user-routes/user-routes');
app.use('/user', userRoutes);
const courseRoutes = require('./routes/course-routes/course-routes');
app.use('/course', courseRoutes);
const adminRoutes = require('./routes/admin-routes/admin-routes')
app.use('/admin', adminRoutes);
const aiRoutes = require('./routes/ai-routes/ai-routes')
app.use('/ai', aiRoutes);
app.use('/notification',notificationRoutes);

const studentRoutes = require('./routes/studentRoutes');
app.use('/api/students', studentRoutes);
// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).json({ 
//     success: false, 
//     message: 'Something went wrong!' 
//   });
// });

// app.put('/admin/get-students/:email', async (req, res) => {
//   const { email } = req.params;
//   const { status } = req.body;

//   // Locate and update the student by email
//   const student = await student.findOneAndUpdate({ email }, { status }, { new: true });
//   if (!student) {
//     return res.status(404).json({ error: 'Student not found' });
//   }
//   res.json(student);
// });
// app.put('/api/students/:id', async (req, res) => {
//   const { id } = req.params;
//   const { status } = req.body;

//   try {
//     const student = await student.findByIdAndUpdate(id, { status }, { new: true });
//     if (!student) {
//       return res.status(404).json({ error: 'Student not found' });
//     }
//     res.json({ message: 'Student status updated', student });
//   } catch (error) {
//     console.error('Error updating student status:', error);
//     res.status(500).json({ error: 'Failed to update student status' });
//   }
// });


app.use("/test", (req, res) => {
  res.send("hello world!");
})

//highlight function developing --zelong
app.use("/highlight", (req, res) => {
  const selectedText = req.body.selectedText;
  console.log(selectedText);
});

setupWebSocketServer(server);


app.get('*', (req, res) => {
  res.sendFile(path.join('/var/www/Lotus-Learning-WebApp/frontend/build', 'index.html'));
});

connectToDatabases()
  .then(() => {
    server.listen(config.PORT, () => {
      logger.info(`Server running on port ${config.PORT}`);
    });
  })
  .catch((err) => {
    logger.error(err, 'Error connecting to the database');
  });