'use strict';

const net = require('node:net');
const { once } = require('node:events');
const { createChannel, expect } = require('./channel.js');
const {
  generateKeys,
  clientHandshake,
  serverHandshake,
} = require('./handshake.js');

const DIMENSION = 3;
const SIZE = 2 ** DIMENSION;
const ROOT = 0;

const nodeOptions = { host: '127.0.0.1', basePort: 4000 };

const label = (id) => id.toString(2).padStart(DIMENSION, '0');

const neighborsOf = (id) =>
  Array.from({ length: DIMENSION }, (_, bit) => id ^ (1 << bit));

const nextHop = (from, to) => {
  const diff = from ^ to;
  return from ^ (diff & -diff);
};

const createQueue = () => {
  const items = [];
  const waiting = [];

  const push = (item) => {
    const next = waiting.shift();
    if (next) next.resolve(item);
    else items.push(item);
  };

  const shift = () => {
    if (items.length > 0) return Promise.resolve(items.shift());
    const next = Promise.withResolvers();
    waiting.push(next);
    return next.promise;
  };

  return { push, shift };
};

const createNode = (id) => {
  const name = label(id);
  const port = nodeOptions.basePort + id;
  const neighbors = neighborsOf(id);
  const links = new Map();
  const inboxes = new Map();
  const sockets = new Set();
  const linked = Promise.withResolvers();
  const server = new net.Server();

  const log = (text) => console.log(`[node ${name}] ${text}`);

  const inbox = (peer) => {
    if (!inboxes.has(peer)) inboxes.set(peer, createQueue());
    return inboxes.get(peer);
  };

  const route = (packet) => {
    const { from, to, message } = packet;
    if (to === id) {
      inbox(from).push(message);
      return;
    }
    const hop = nextHop(id, to);
    if (from !== id) {
      const path = `${label(from)} → ${label(to)}`;
      log(`Forward ${message.type} ${path} via ${label(hop)}`);
    }
    links.get(hop).send(packet);
  };

  const read = async (channel) => {
    while (true) {
      const packet = await channel.receive();
      if (!packet) return;
      route(packet);
    }
  };

  const open = (socket) => {
    sockets.add(socket);
    socket.on('error', (error) => log(`Socket error: ${error.message}`));
    return createChannel(socket);
  };

  const addLink = (neighbor, channel) => {
    links.set(neighbor, channel);
    if (links.size === neighbors.length) linked.resolve();
    read(channel).catch((error) => log(`Link error: ${error.message}`));
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

  const channelTo = (peer) => ({
    send: (message) => route({ from: id, to: peer, message }),
    receive: () => inbox(peer).shift(),
  });

  const close = () => {
    for (const socket of sockets) socket.end();
    server.close();
  };

  return { id, name, log, start, link, channelTo, close };
};

const main = async () => {
  console.log(`Hypercube: dimension ${DIMENSION}, ${SIZE} nodes`);
  const nodes = Array.from({ length: SIZE }, (_, id) => createNode(id));
  await Promise.all(nodes.map((node) => node.start()));
  await Promise.all(nodes.map((node) => node.link()));

  const root = nodes[ROOT];
  const others = nodes.filter((node) => node !== root);
  const keys = generateKeys();
  const silent = () => {};

  console.log(`\nHandshakes with root ${root.name}`);
  const accept = (node) =>
    serverHandshake(root.channelTo(node.id), keys, silent);
  const join = async (node) => {
    await clientHandshake(node.channelTo(ROOT), silent);
    node.log(`Secure session with ${root.name} established`);
  };
  await Promise.all([...others.map(accept), ...others.map(join)]);

  for (const node of nodes) node.close();
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
