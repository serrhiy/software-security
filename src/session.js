'use strict';

const crypto = require('node:crypto');

const ALGORITHM = 'aes-256-gcm';

const encrypt = (key, text) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const data = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return {
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    data: data.toString('base64'),
  };
};

const decrypt = (key, message) => {
  const iv = Buffer.from(message.iv, 'base64');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(Buffer.from(message.tag, 'base64'));
  const data = Buffer.from(message.data, 'base64');
  const text = Buffer.concat([decipher.update(data), decipher.final()]);
  return text.toString('utf8');
};

module.exports = { encrypt, decrypt };
