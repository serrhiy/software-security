'use strict';

const net = require('node:net');
const { once } = require('node:events');

const clientOptions = {
  socket: { keepAlive: true },
  connect: { host: '127.0.0.1', port: 3000 },
};

const log = (text) => console.log(`[client] ${text}`);

const main = async () => {
  const socket = new net.Socket(clientOptions.socket);
  socket.connect(clientOptions.connect);
  await once(socket, 'connect');
  log(`Connected to ${socket.remoteAddress}:${socket.remotePort}`);
  socket.on('error', (error) => log(`Socket error: ${error.message}`));

  socket.end();
  await once(socket, 'close');
  log('Connection closed');
};

main().catch((error) => {
  log(`Error: ${error.message}`);
  process.exit(1);
});
