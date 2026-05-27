let ioInstance;

const initSocket = (server, corsOrigin = '*') => {
  const { Server } = require('socket.io');
  ioInstance = new Server(server, {
    cors: {
      origin: corsOrigin,
      methods: ['GET', 'POST'],
    },
  });

  ioInstance.on('connection', (socket) => {
    // Basic connection handling
  });

  return ioInstance;
};

const getIo = () => ioInstance;

const emitSocketEvent = (event, payload) => {
  if (ioInstance) {
    ioInstance.emit(event, payload);
  }
};

module.exports = {
  initSocket,
  getIo,
  emitSocketEvent,
};
