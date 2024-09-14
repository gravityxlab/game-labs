const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const logger = require('./logger');
const setupPinoHttpLogger = require('./pino-http-logger');
const Game = require('./Game');
const system = require('./system');

const app = express();

const server = http.createServer(app);

const io = socketIo(server);
setupPinoHttpLogger(app);

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/system/usage', (req, res) => {
  const index = Number(req.query.start_line_index) || 0;
  fs.readFile(path.join(__dirname, '..', 'system.log'), (err, file) => {

    const regex = new RegExp(`(?:.*\\n){${index}}`);

    if (err) {
      return res.status(400).send();
    }

    try {
      const logLines = file.toString().replace(regex, '\n'.repeat(index)).trim().split('\n');
      const data = logLines.map(line => JSON.parse(line));
    
      res.send({
        data,
      });
    } catch (error) {
      res.send({
        data: [],
      });
    }
  });
});

app.get('/system/usage/latest', (req, res) => {
  fs.readFile(path.join(__dirname, '..', 'system.log'), (err, data) => {

    const regex = /(\{.*\})\s*$/;

    if (err) {
      return res.status(400).send();
    }

    const logLines = data.toString();

    const match = logLines.match(regex);

    if (match) {
      res.send({
        data: JSON.parse(match[1]),
      });
    } else {
      res.status(404).send();
    }
  });
});

const game = new Game();

game.events.end = () => {
  io.emit('auth', { ok: false });
};

system.metadata.socket_count = 100;

io.on('connection', (socket) => {
  system.metadata.socket_count++;
  let token = socket.handshake.auth.token;
  socket.emit('auth', { ok: Boolean(game.getPlayerPos(token)), token });

  socket.on('login', (data) => {
    if (!game.distribution[data.name] && !game.flag) {
      token = data.name;
      game.join(token);

      socket.emit('auth', { ok: true, token });
      logger.app.info({ event: 'user.login', token });
    } else {
      socket.emit('auth', { ok: false });
    }
  });

  socket.on('play', (data) => {
    game.start();
  });

  socket.on('player:update', (data) => {
    if (game.getPlayerPos(token)) {
      game.sePlayerPos(token, data.pos);
      game.ifWin(token);
    }
  });

  socket.on('disconnect', () => {
    system.metadata.socket_count--;
  });
});

const tickRate = 60;
const sendData = () => {
  io.emit('broadcast', {  timestamp: new Date(), distribution: game.distribution, flag: game.flag });
  setTimeout(sendData, tickRate);
};

sendData();

// 启动服务器
const port = 3002;
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
