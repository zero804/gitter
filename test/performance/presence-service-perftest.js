/*jslint node: true */
/*global describe:true, it: true, beforeEach:true, afterEach:true */
"use strict";

var testRequire = require('../integration/test-require');

var presenceService = testRequire('./services/presence-service');
var _ = require('underscore');
var assert = require('assert');
var winston = testRequire("./utils/winston");
var Q = require("q");

var fakeEngine = {
  clientExists: function(socketId, callback) { callback(!socketId.match(/^TEST/)); }
};


function FakeClient(socketId, userId, troupeId, script, done) {
  _.bindAll(this, 'connect', 'associateWithTroupe', 'disconnect', 'signalEyeball', 'next');
  this.socketId = socketId;
  this.userId = userId;
  this.troupeId = troupeId;
  this.script = script;
  this.done = done;
  this.eyeballSignal = 0;
}

FakeClient.prototype = {
  connect: function(callback) {
    presenceService.userSocketConnected(this.userId, this.socketId, callback);
  },

  associateWithTroupe: function(callback) {
    var self = this;
    presenceService.userSubscribedToTroupe(this.userId, this.troupeId, this.socketId, function(err) {
      if(err) return callback(err);
      self.eyeballSignal = 1;
      callback();
    });
  },

  disconnect: function(callback) {
    presenceService.socketDisconnected(this.socketId, callback);
  },

  signalEyeball: function(callback) {
    var newSignal = this.eyeballSignal ? 0 : 1;
    var self = this;
    presenceService.clientEyeballSignal(this.userId, this.socketId, newSignal, function(err) {
      if(err) return callback(err);
      self.eyeballSignal = newSignal;
      callback();
    });
  },

  next: function(err) {
    if(err) {
      console.log("Error: action " + this.lastAction + " failed", err);
      // The client has failed
      return this.done(err);
    }

    var nextAction = this.script.shift();
    this.lastAction = nextAction;
    switch(nextAction) {
      case 0:
        return this.connect(this.next);
      case 1:
        return this.associateWithTroupe(this.next);
      case 2:
        return this.signalEyeball(this.next);
      case 3:
        return this.disconnect(this.next);

      default:
        return this.done();
    }
  }

};

function doTest(iterations, done) {
  var n = Date.now();

  var promises = [];
  for(var i = 0; i < iterations; i++) {
    var d = Q.defer();

    var userId = 'TESTUSER' + i + '-' + n;
    var socketId = 'TESTSOCKET' + i + '-' + n;
    var troupeId = 'TESTTROUPE' + (i % 10) + '-' + n;

    var script = [0];
    for(var j = 1; j < i; j++) {
      script.push(Math.min(2, j));
    }
    script.push(3);

    var c = new FakeClient(socketId, userId, troupeId, script, d.makeNodeResolver());
    c.next();

    promises.push(d.promise);
  }

  Q.all(promises).then(function() {
    var troupeIds = [];
    for(var i = 0; i < iterations; i++) {
      troupeIds.push('TESTTROUPE' + (i % 10) + '-' + n);
    }

    troupeIds = _.uniq(troupeIds);

    var promises2 = troupeIds.map(function(troupeId) {
      var d = Q.defer();
      presenceService.findOnlineUsersForTroupe(troupeId, function(err, users) {
        if(err) return d.reject(err);
        assert(users.length === 0);
        d.resolve();
      });

      return d.promise;
    });

    Q.all(promises2).then(function() { done(); }, done).fail(done);

  }, done).fail(done);
}

describe('presenceService', function() {
  function cleanup(done) {
    presenceService.collectGarbage(fakeEngine, function(err) {
      if(err) return done(err);

      return done();
    });
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should warmup', function(done) {
    var userId = 'TESTUSER1' + Date.now();
    var socketId = 'TESTSOCKET1' + Date.now();
    var troupeId = 'TESTTROUPE1' + Date.now();

    var c = new FakeClient(socketId, userId, troupeId, [0,1,2,2,2,2,2,2,2,3], done);
    c.next();
  });

  it('should handle 100 clients', function(done) {
    doTest(100, done);
  });


});

