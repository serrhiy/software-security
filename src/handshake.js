'use strict';

const crypto = require('node:crypto');
const { expect } = require('./channel.js');

const short = (buffer) => `${buffer.toString('hex').slice(0, 16)}...`;

const generateKeys = () =>
  crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });

const clientHandshake = async (channel, log) => {
  const clientRandom = crypto.randomBytes(32);
  channel.send({
    type: 'client_hello',
    random: clientRandom.toString('base64'),
  });
  log(`1. client_hello sent, random: ${short(clientRandom)}`);

  const serverHello = await expect(channel, 'server_hello');
  const serverRandom = Buffer.from(serverHello.random, 'base64');
  log(`2. server_hello received, random: ${short(serverRandom)}`);
  log('2. Server public key received');
};

const serverHandshake = async (channel, keys, log) => {
  const clientHello = await expect(channel, 'client_hello');
  const clientRandom = Buffer.from(clientHello.random, 'base64');
  log(`1. client_hello received, random: ${short(clientRandom)}`);

  const serverRandom = crypto.randomBytes(32);
  channel.send({
    type: 'server_hello',
    random: serverRandom.toString('base64'),
    publicKey: keys.publicKey.export({ type: 'spki', format: 'pem' }),
  });
  log(`2. server_hello sent, random: ${short(serverRandom)}`);
  log('2. Server public key sent');
};

module.exports = { generateKeys, clientHandshake, serverHandshake };
