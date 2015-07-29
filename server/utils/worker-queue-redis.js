/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var redis = require('./redis');
var resque = require("node-resque");
var env = require('gitter-web-env');
var logger = env.logger;
var debug = require('debug')('gitter:worker-queue');
var stats = env.stats;
var os = require('os');

var connectionDetails = {
  redis: redis.createClient()
};

// scheduler is responbsible for scheduling delayed jobs and giving them to the workers.
var scheduler = new resque.scheduler({connection: connectionDetails}, function() {});

scheduler.on('start', function() {
  debug('scheduler started');
});

scheduler.on('error', function(err) {
  logger.error('worker-queue-redis: scheduler failed: ' + err, { exception: err });
  stats.event('resque.scheduler.error');
});

var jobs = {
  echo: {
    perform: function(data, callback) {
      callback(null, data);
    }
  }
};

var uniqueWorkerCounter = 0;

var Queue = function(name, options, loaderFn) {
  this.name = name;
  this.fn = loaderFn();

  var self = this;

  uniqueWorkerCounter++;
  var workerOpts = {
    connection: connectionDetails,
    timeout: 100,
    /*
     * "If you plan to run more than one worker per nodejs process,
     * be sure to name them something distinct. Names must follow
     * the patern 'hostname:pid+unique_id'."
     *
     * from https://github.com/taskrabbit/node-resque#notes
     */
    name: os.hostname() + ":" + process.pid + "+" + uniqueWorkerCounter,
    queues: [name]
  };
  this.worker = new resque.worker(workerOpts, jobs, function() {
    if(scheduler.running) {
      self.worker.workerCleanup();
      self.worker.start();
    } else {
      scheduler.once('start', function() {
        self.worker.workerCleanup();
        self.worker.start();
      });
    }
  });

  this.internalQueue = new resque.queue({ connection: connectionDetails }, jobs, function() {
    // ready to add to queue
  });

  this.worker.on('start', function() {
    debug('started %s', self.name);
    stats.event('resque.worker.started');
  });

  this.worker.on('end', function() {
    debug('ended %s', self.name);
    stats.event('resque.worker.ended');
  });

  this.worker.on('cleaning_worker', function(worker) {
    debug('cleaning old worker %s', worker);
    stats.event('resque.worker.cleaning');
  });

  this.worker.on('poll', function() {
    debug('poll');
    stats.eventHF('resque.worker.polling', 1, 0.005);
  });

  this.worker.on('job', function(queue) {
    debug("job: %s", queue);
    stats.eventHF('resque.worker.working');
  });

  this.worker.on('reEnqueue', function(queue/*, job, plugin*/) {
    debug("reenqueue job on queue %s", queue);
    stats.event('resque.worker.reenqueue');
  });

  this.worker.on('pause', function() {
    debug("paused");
    stats.eventHF('resque.worker.paused', 1, 0.005);
  });

  this.worker.on('success', function(queue, job, result) {
    debug("success");
    self.fn(result, function(err) {
      if(err) return logger.error('worker-queue-redis: callback failed: ' + err, { queue: queue, job: job, exception: err });
    });
    stats.eventHF('resque.worker.success');
  });

  this.worker.on('error', function(queue, job, err) {
    logger.error('worker-queue-redis: failed: ' + err, { queue: queue, job: job, exception: err });
    stats.event('resque.worker.error');
  });
};

Queue.prototype.invoke = function(data, options, callback) {
  if(arguments.length == 2 && typeof options == 'function') {
    callback = options;
    options = {};
  }

  var delay = options && options.delay || 0;

  this.internalQueue.enqueueIn(delay, this.name, 'echo', data);

  if(callback) callback();
};

Queue.prototype.destroy = function() {
  this.worker.end();
};

module.exports = {
  queue: function(name, options, loaderFn) {
    if(!options) options = {};
    return new Queue(name, options, loaderFn);
  },
  startScheduler: function() {
    scheduler.start();
  },
  stopScheduler: function(callback) {
    scheduler.end(callback);
  }
};
