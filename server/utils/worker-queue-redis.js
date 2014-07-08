/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var redis = require('./redis');
var resque = require("node-resque");
var winston = require('./winston');

var connectionDetails = {
  redis: redis.createClient()
};

var scheduler = new resque.scheduler({connection: connectionDetails}, function(){
  scheduler.start();
});

var jobs = {
  echo: {
    perform: function(data, callback) {
      callback(null, data);
    }
  }
};

var Queue = function(name, options, loaderFn) {
  this.name = name;
  this.fn = loaderFn();

  var self = this;

  var worker = new resque.worker({connection: connectionDetails, queues: [name]}, jobs, function(){
    worker.workerCleanup();
    worker.start();
  });

  this.internalQueue = new resque.queue({connection: connectionDetails}, jobs, function(){
    // ready to add to queue
  });

  worker.on('success', function(queue, job, result){
    self.fn(result, function(err) {
      if(err) return winston.error('worker calback failed:' + err, { exception: err });
    });
  });

  worker.on('error', function(queue, job, err) {
    winston.error('queue worker failed:' + err, { queue: queue, job: job, exception: err });
  });
};

Queue.prototype.invoke = function(data, options, callback) {
  if(arguments.length == 2 && typeof options == 'function') {
    callback = options;
    options = {};
  }

  var delay = options && options.delay || 0;

  this.internalQueue.enqueueIn(delay, this.name, 'echo', data);
};

module.exports = {
  queue: function(name, options, loaderFn) {
    if(!options) options = {};
    return new Queue(name, options, loaderFn);
  }
};
