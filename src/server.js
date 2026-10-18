'use strict';

const net = require('node:net');
const readline = require('node:readline');
const { createChannel } = require('./channel.js');
const { generateKeys, serverHandshake } = require('./handshake.js');

const serverOptions = {
  socket: { keepAlive: true },
  listen: { host: '0.0.0.0', port: 3000 },
};

const sessions = new Set();

const serve = async (socket, keys, log) => {
  const channel = createChannel(socket);
  const session = await serverHandshake(channel, keys, log);
  sessions.add(session);

  try {
    for await (const text of session) log(`Decrypted: ${text}`);
  } finally {
    sessions.delete(session);
  }

  log('Client disconnected');
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

    serve(socket, keys, log).catch((error) => {
      log(`Error: ${error.message}`);
      socket.destroy();
    });
  });

  tcpServer.on('listening', () => {
    const { address, port } = tcpServer.address();
    console.log(`Server listening on ${address}:${port}`);
  });

  const input = readline.createInterface({ input: process.stdin });
  input.on('line', (text) => {
    if (sessions.size === 0) console.log('No connected clients');
    for (const session of sessions) session.send(text);
  });
};

main();
