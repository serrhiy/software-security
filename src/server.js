'use strict';

const net = require('node:net');
const { createChannel } = require('./channel.js');
const { generateKeys, serverHandshake } = require('./handshake.js');

const serverOptions = {
  socket: { keepAlive: true },
  listen: { host: '0.0.0.0', port: 3000 },
};

const serve = async (socket, keys, log) => {
  const channel = createChannel(socket);
  await serverHandshake(channel, keys, log);
};

const main = () => {
  const keys = generateKeys();
  console.log('RSA key pair generated (2048 bit)');

  const tcpServer = new net.Server(serverOptions.socket);
  tcpServer.listen(serverOptions.listen);
  let count = 0;

  tcpServer.on('connection', (socket) => {
    const id = ++count;
    const log = (text) => console.log(`[session ${id}] ${text}`);
    log(`Client connected from ${socket.remoteAddress}:${socket.remotePort}`);
    socket.on('error', (error) => log(`Socket error: ${error.message}`));
    socket.on('close', () => log('Client disconnected'));

    serve(socket, keys, log).catch((error) => {
      log(`Error: ${error.message}`);
      socket.destroy();
    });
  });

  tcpServer.on('listening', () => {
    const { address, port } = tcpServer.address();
    console.log(`Server listening on ${address}:${port}`);
  });
};

main();
