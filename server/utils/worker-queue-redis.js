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

scheduler.on('error', function(err){
  winston.error('scheduler failed: ' + err, { exception: err });
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

  this.worker = new resque.worker({connection: connectionDetails, queues: [name]}, jobs, function(){
    self.worker.workerCleanup();
    self.worker.start();
  });

  this.internalQueue = new resque.queue({connection: connectionDetails}, jobs, function(){
    // ready to add to queue
  });

  this.worker.on('start', function() {
    winston.silly('worker started');
  });

  this.worker.on('end', function(){
    winston.silly("worker ended");
  });

  this.worker.on('cleaning_worker', function(worker) {
    winston.silly("cleaning old worker " + worker);
  });

  this.worker.on('poll',            function(queue){
    winston.silly("worker polling " + queue);
  });

  this.worker.on('job', function(queue, job){
    winston.silly("working job " + queue + " " + JSON.stringify(job));
  });

  this.worker.on('reEnqueue', function(queue, job, plugin){
    winston.silly("reEnqueue job (" + plugin + ") " + queue + " " + JSON.stringify(job));
  });

  this.worker.on('pause', function(){
    winston.silly("worker paused");
  });

  this.worker.on('success', function(queue, job, result){
    self.fn(result, function(err) {
      if(err) return winston.error('worker callback failed: ' + err, { exception: err });
    });
  });

  this.worker.on('error', function(queue, job, err) {
    winston.error('queue worker failed: ' + err, { queue: queue, job: job, exception: err });
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

Queue.prototype.destroy = function() {
  this.worker.end();
};

module.exports = {
  queue: function(name, options, loaderFn) {
    if(!options) options = {};
    return new Queue(name, options, loaderFn);
  }
};
