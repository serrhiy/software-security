'use strict';

const net = require('node:net');
const { once } = require('node:events');
const { createChannel, expect } = require('./channel.js');

const DIMENSION = 3;
const SIZE = 2 ** DIMENSION;

const nodeOptions = { host: '127.0.0.1', basePort: 4000 };

const label = (id) => id.toString(2).padStart(DIMENSION, '0');

const neighborsOf = (id) =>
  Array.from({ length: DIMENSION }, (_, bit) => id ^ (1 << bit));

const createNode = (id) => {
  const name = label(id);
  const port = nodeOptions.basePort + id;
  const neighbors = neighborsOf(id);
  const links = new Map();
  const sockets = new Set();
  const linked = Promise.withResolvers();
  const server = new net.Server();

  const log = (text) => console.log(`[node ${name}] ${text}`);

  const open = (socket) => {
    sockets.add(socket);
    socket.on('error', (error) => log(`Socket error: ${error.message}`));
    return createChannel(socket);
  };

  const addLink = (neighbor, channel) => {
    links.set(neighbor, channel);
    if (links.size === neighbors.length) linked.resolve();
  };

  const accept = async (socket) => {
    const channel = open(socket);
    const { from } = await expect(channel, 'link');
    addLink(from, channel);
  };

  const connect = async (neighbor) => {
    const socket = new net.Socket();
    socket.connect({ ...nodeOptions, port: nodeOptions.basePort + neighbor });
    await once(socket, 'connect');
    const channel = open(socket);
    channel.send({ type: 'link', from: id });
    addLink(neighbor, channel);
  };

  const start = async () => {
    server.on('connection', (socket) => {
      accept(socket).catch((error) => log(`Link error: ${error.message}`));
    });
    server.listen({ host: nodeOptions.host, port });
    await once(server, 'listening');
  };

  const link = async () => {
    const higher = neighbors.filter((neighbor) => neighbor > id);
    await Promise.all(higher.map(connect));
    await linked.promise;
    log(`Port ${port}, linked with ${neighbors.map(label).join(', ')}`);
  };

  const close = () => {
    for (const socket of sockets) socket.end();
    server.close();
  };

  return { id, name, log, start, link, close };
};

const main = async () => {
  console.log(`Hypercube: dimension ${DIMENSION}, ${SIZE} nodes`);
  const nodes = Array.from({ length: SIZE }, (_, id) => createNode(id));
  await Promise.all(nodes.map((node) => node.start()));
  await Promise.all(nodes.map((node) => node.link()));

  for (const node of nodes) node.close();
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
