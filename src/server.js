'use strict';

const net = require('node:net');

const serverOptions = {
  socket: { keepAlive: true },
  listen: { host: '0.0.0.0', port: 3000 },
};

const main = () => {
  const tcpServer = new net.Server(serverOptions.socket);
  tcpServer.listen(serverOptions.listen);
  let count = 0;

  tcpServer.on('connection', (socket) => {
    const id = ++count;
    const log = (text) => console.log(`[session ${id}] ${text}`);
    log(`Client connected from ${socket.remoteAddress}:${socket.remotePort}`);
    socket.on('error', (error) => log(`Socket error: ${error.message}`));
    socket.on('close', () => log('Client disconnected'));
  });

  tcpServer.on('listening', () => {
    const { address, port } = tcpServer.address();
    console.log(`Server listening on ${address}:${port}`);
  });
};

main();
