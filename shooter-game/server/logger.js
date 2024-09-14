const pino = require('pino');
const path = require('path');

const logger = {
  app: pino({
    transport: {
      target: 'pino/file',
      options: {
        destination: path.join(__dirname, '..', 'app.log'),
        append: true
      },
    },
  }),
  system: pino({
    transport: {
      target: 'pino/file',
      options: {
        destination: path.join(__dirname, '..', 'system.log'),
        append: true
      },
    },
  }),
};

module.exports = logger;