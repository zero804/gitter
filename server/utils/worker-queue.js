/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

//var nconf = require('./config');
var winston = require('./winston');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

function TimerQueue(name, options, loaderFn) {
  this.name = name;
  this.fn = loaderFn();
}

TimerQueue.prototype.invoke = function(data, options, callback) {

  if(arguments.length == 2 && typeof options == 'function') {
    callback = options;
    options = {};
  }

  var that = this;

  var attempts = options && options.attempts || 2;
  var delay =options && options.delay || 0;

  retryAttempt(delay);

  if(callback) callback();

  function attempt(attemptComplete) {
    try {
      that.fn(data, attemptComplete);
    } catch(e) {
      attemptComplete(e);
    }
  }

  function retryAttempt(delay) {
    setTimeout(function() {
      attempt(function(err) {
        if(err) {
          winston.error(that.name +  ' job failed: ' + err);
          if(--attempts) retryAttempt(0);
        }
      });
    }, delay);
  }

};

function Controller() {
    EventEmitter.call(this);
    this.state = 'STOPPED';
}

util.inherits(Controller, EventEmitter);

Controller.prototype.startWorkers = function() {
  this.state = 'STARTED';
  this.emit("startWorkers");
};

Controller.prototype.stopWorkers = function() {
  this.state = 'STOPPED';
  this.emit("stopWorkers");
};

Controller.prototype.onStart = function(fn) {
  if(this.state == 'STARTED') {
    fn();
  } else {
    this.on('startWorkers', fn);
  }
};


var controller = new Controller();

module.exports = {
  startWorkers: function() {
    controller.startWorkers();
  },
  stopWorkers: function() {
    controller.stopWorkers();
  },
  queue: function(name, options, loaderFn) {
    if(!options) options = {};
    options.controller = controller;
    return new TimerQueue(name, options, loaderFn);
  },
  TimerQueue: TimerQueue
};