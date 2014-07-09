/*jshint node:true, unused:true */
"use strict";


var redis = require('./redis');
var winston = require('./winston');
var workerQueue = require('./worker-queue');

var PREFIX = "rb:";

function emptyFn (err) {
  if(err) winston.warn('Warning ' + err, { exception: err });
}

// Name of batcher and the delay in milliseconds
var RedisBatcher = function(name, delay) {
  this.name = name;
  this.redisClient = redis.createClient();
  this.prefix = PREFIX;
  this.delay = delay;


};

RedisBatcher.prototype = {
  getKey: function(key) {
    return this.prefix + this.name + ':' + key;
  },

  // Callback(err)
  add: function(key, item, callback) {
    if(!callback) callback = emptyFn;

    var self = this;

    var redisKey = this.getKey(key);

    this.redisClient.rpush(redisKey, item, function(err, reply) {
      if(err) return callback(err);

      if(reply === 1) {
        self.addToQueue(key, callback);
      } else {
        callback();
      }
    });
  },

  listen: function(handler) {
    var self = this;

    this.queue = workerQueue.queue('redis-batch-' + this.name, {}, function() {
      return function(data, done) {
        self.dequeue(data.key, handler, done);
      };
    });
  },

  dequeue: function(key, handler, done) {
    var redisKey = this.getKey(key);

    this.redisClient.multi()
      .lrange(redisKey, 0, -1)
      .del(redisKey)
      .exec(function(err, replies) {
        if(err) return done(err);

        var items = replies[0];
        return handler(key, items, done);
      });
  },

  addToQueue: function(key, callback) {
    this.queue.invoke({ key: key }, { delay: this.delay }, callback);
  }

};

exports.RedisBatcher = RedisBatcher;