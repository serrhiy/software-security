'use strict';

const readline = require('node:readline');

const createChannel = (socket) => {
  const lines = readline.createInterface({ input: socket });
  const iterator = lines[Symbol.asyncIterator]();

  const send = (message) => {
    socket.write(`${JSON.stringify(message)}\n`);
  };

  const receive = async () => {
    const { value, done } = await iterator.next();
    return done ? null : JSON.parse(value);
  };

  return { send, receive };
};

const expect = async (channel, type) => {
  const message = await channel.receive();
  if (!message) throw new Error(`Connection closed, expected ${type}`);
  if (message.type !== type) {
    throw new Error(`Expected ${type}, got ${message.type}`);
  }
  return message;
};

module.exports = { createChannel, expect };
