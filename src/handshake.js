'use strict';

const crypto = require('node:crypto');
const { expect } = require('./channel.js');

const OAEP = {
  padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
  oaepHash: 'sha256',
};

const short = (buffer) => `${buffer.toString('hex').slice(0, 16)}...`;

const fingerprint = (key) =>
  crypto.createHash('sha256').update(key).digest('hex').slice(0, 16);

const generateKeys = () =>
  crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });

const deriveKey = (premaster, clientRandom, serverRandom) => {
  const salt = Buffer.concat([clientRandom, serverRandom]);
  const key = crypto.hkdfSync('sha256', premaster, salt, 'session key', 32);
  return Buffer.from(key);
};

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

  const premaster = crypto.randomBytes(48);
  const encrypted = crypto.publicEncrypt(
    { key: serverHello.publicKey, ...OAEP },
    premaster,
  );
  channel.send({ type: 'premaster', data: encrypted.toString('base64') });
  log(`3. premaster generated: ${short(premaster)}`);
  log(`3. premaster sent, encrypted with public key: ${short(encrypted)}`);

  const key = deriveKey(premaster, clientRandom, serverRandom);
  log(`4. Session key generated, fingerprint: ${fingerprint(key)}`);
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

  const { data } = await expect(channel, 'premaster');
  const premaster = crypto.privateDecrypt(
    { key: keys.privateKey, ...OAEP },
    Buffer.from(data, 'base64'),
  );
  log(`3. premaster received and decrypted: ${short(premaster)}`);

  const key = deriveKey(premaster, clientRandom, serverRandom);
  log(`4. Session key generated, fingerprint: ${fingerprint(key)}`);
};

module.exports = { generateKeys, clientHandshake, serverHandshake };
