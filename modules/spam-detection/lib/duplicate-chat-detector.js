'use strict';

var env = require('gitter-web-env');
var config = env.config;
var fs = require('fs');
var path = require('path');
var Promise = require('bluebird');
var crypto = require('crypto');
var logger = env.logger.get('spam-detection');

var redisClient = env.ioredis.createClient(config.get('redis_nopersist'), {
  keyPrefix: "spam:"
});

var TTL = 86400;
var MAX_DUPLICATE_MESSAGES = 10;
var WARN_DUPLICATE_MESSAGES = 8;

function defineCommand(name, script, keys) {
  redisClient.defineCommand(name, {
    lua: fs.readFileSync(path.join(__dirname, '..', 'redis-lua', script + '.lua')),
    numberOfKeys: keys
  });
}

defineCommand('spamDetectionCountChatForUser', 'count-chat-for-user', 1);

function addHash(userId, hash, text) {
  return redisClient.spamDetectionCountChatForUser('dup:' + String(userId), hash, TTL)
    .then(function(count) {
      if (count > WARN_DUPLICATE_MESSAGES) {
        logger.warn('User sending duplicate messages', {
          count: count,
          text: text,
          userId: userId
        });
      }

      return count > MAX_DUPLICATE_MESSAGES;
    })

}
/**
 * Super basic spam detection
 */
function detect(userId, text) {
  var hash = crypto.createHash('md5').update(text).digest('hex');
  return addHash(userId, hash, text);
}

module.exports = Promise.method(detect);
