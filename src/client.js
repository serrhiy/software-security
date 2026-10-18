'use strict';

const net = require('node:net');
const readline = require('node:readline');
const { once } = require('node:events');
const { createChannel } = require('./channel.js');
const { clientHandshake } = require('./handshake.js');

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

  const channel = createChannel(socket);
  const session = await clientHandshake(channel, log);

  log('Type a message and press Enter');
  const input = readline.createInterface({ input: process.stdin });
  input.on('line', (text) => session.send(text));
  input.on('close', () => socket.end());

  for await (const text of session) log(`Decrypted: ${text}`);

  log('Connection closed');
  input.close();
};

main().catch((error) => {
  log(`Error: ${error.message}`);
  process.exit(1);
});
