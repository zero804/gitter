/*jslint node: true */
/*global describe:true, it: true, beforeEach:true, afterEach:true */
"use strict";

var testRequire = require('./test-require');

var presenceService = testRequire('./services/presence-service');

var assert = require('assert');
var winston = testRequire("./utils/winston");
var Q = require("q");

var fakeEngine = {
  clientExists: function(clientId, callback) { callback(!clientId.match(/^TEST/)); }
};




describe('presenceService', function() {
  function cleanup(done) {
    presenceService.collectGarbage(fakeEngine, function(err) {
      if(err) return done(err);

      return done();
    });
  }

  beforeEach(cleanup);
  afterEach(cleanup);

  it('should cleanup invalid sockets correctly', function(done) {

    presenceService.listOnlineUsers(function(err, users) {
      if(err) return done(err);

      var noTestUsersOnline = users.length === 0 || users.every(function(id) { return !id.match(/^TEST/); });

      assert(noTestUsersOnline, 'Garbage collection does not seem to have run correctly ' + users.join(', '));

      done();
    });

  });

  it('users presence should appear and disappear as expected', function(done) {
    var userId = 'TESTUSER1' + Date.now();
    var socketId = 'TESTSOCKET1' + Date.now();
    var troupeId = 'TESTTROUPE1' + Date.now();

    // Make sure things are clean
    presenceService.findOnlineUsersForTroupe(troupeId, function(err, users) {
      if(err) return done(err);

      // User should not exist
      assert(users.length === 0 || users.every(function(id) { return id !== userId; }), 'Expected user _not_ to be online at beginning of test: ', users.join(', '));

      // Connect the socket
      presenceService.userSocketConnected(userId, socketId, function(err) {
        if(err) return done(err);

        // Check that the lookup code is working as expected
        presenceService.lookupUserIdForSocket(socketId, function(err, returnedUserId) {
          if(err) return done(err);

          assert(returnedUserId === userId);

          // Subscribe to a troupe
          presenceService.userSubscribedToTroupe(userId, troupeId, socketId, function(err) {
            if(err) return done(err);

            // Make sure that the user appears online
            presenceService.findOnlineUsersForTroupe(troupeId, function(err, users) {
              if(err) return done(err);

              assert(users.some(function(id) { return id === userId; }), 'Expected user to be online');

              // Disconnect the socket
              presenceService.socketDisconnected(socketId, function(err) {
                if(err) return done(err);

                // Check if the user is still in the troupe
                presenceService.findOnlineUsersForTroupe(troupeId, function(err, users) {
                  if(err) return done(err);

                  var notThere = (!users.length || users.every(function(id) { return id !== userId; }));

                  assert(notThere, 'Expect user to be offline: online users are: ' + users.join(', '));

                  done();
                });

              });
            });
          });
        });
      });
    });


  });

  it('should handle very quick connect/disconnect cycles when the user connects to a troupe', function(done) {
    var userId = 'TESTUSER2' + Date.now();
    var socketId = 'TESTSOCKET2' + Date.now();
    var troupeId = 'TESTTROUPE2' + Date.now();

    var d1 = Q.defer();
    var d2 = Q.defer();

    // This simulates three events happening in very quick succession
    presenceService.userSocketConnected(userId, socketId, function(err) {
      if(err) { return d1.reject(); }

      presenceService.userSubscribedToTroupe(userId, troupeId, socketId, d1.makeNodeResolver());
      presenceService.socketDisconnected(socketId, d2.makeNodeResolver());
    });

    Q.all([d1.promise, d2.promise]).then(function() {
      presenceService.categorizeUsersByOnlineStatus([userId], function(err, statii) {
        assert(!statii[userId]);

        presenceService.listOnlineUsersForTroupes([troupeId], function(err, troupeOnlineUsers) {
          assert(troupeOnlineUsers[troupeId].length === 0);

          done();
        });

      });

    }, done);


  });


  it('should handle eye-balls-on, eyes-balls-off', function(done) {
    var userId = 'TESTUSER3' + Date.now();
    var socketId = 'TESTSOCKET3' + Date.now();
    var troupeId = 'TESTTROUPE3' + Date.now();

    function assertUserTroupeStatus(inTroupe, callback) {
      // Make sure that the user appears online
      presenceService.findOnlineUsersForTroupe(troupeId, function(err, users) {
        if(err) return done(err);

        if(inTroupe) {
          assert(users.some(function(id) { return id === userId; }), 'Expected user to be online');
        } else {
          assert(users.every(function(id) { return id !== userId; }), 'Expected user not to be online (OFFLINE)');
        }

        callback();
      });
    }

    // To start off, the user should not be in the troupe
    assertUserTroupeStatus(false, function() {

      // Connect socket
      presenceService.userSocketConnected(userId, socketId, function(err) {
        if(err) return done(err);

        // Associate socket with troupe
        presenceService.userSubscribedToTroupe(userId, troupeId, socketId, function(err) {
          if(err) return done(err);

          // Now the user should be online
          assertUserTroupeStatus(true, function() {
            // Signal user as not focused
            presenceService.clientEyeballSignal(userId, socketId, 0, function(err) {
              if(err) return done(err);

              // Should not be in troupe
              assertUserTroupeStatus(false, function() {

                // Signal user as being back in troupe
                presenceService.clientEyeballSignal(userId, socketId, 1, function(err) {
                  if(err) return done(err);

                  // User should be in troupe
                  assertUserTroupeStatus(true, function() {

                    // Disconnect socket
                    presenceService.socketDisconnected(socketId, function(err) {
                      if(err) return done(err);

                      // USer should not be in troupe
                      assertUserTroupeStatus(false, function() {
                        done();

                      });

                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });


  it('should handle incorrect eyeball signals', function(done) {

    function assertUserTroupeStatus(inTroupe, callback) {
      // Make sure that the user appears online
      presenceService.findOnlineUsersForTroupe(troupeId, function(err, users) {
        if(err) return done(err);

        if(inTroupe) {
          assert(users.some(function(id) { return id === userId; }), 'Expected user to be online');
        } else {
          assert(users.every(function(id) { return id !== userId; }), 'Expected user not to be online (OFFLINE)');
        }

        callback();
      });
    }

    var userId = 'TESTUSER4' + Date.now();
    var socketId = 'TESTSOCKET4' + Date.now();
    var troupeId = 'TESTTROUPE4' + Date.now();

    // Connect socket
    presenceService.userSocketConnected(userId, socketId, function(err) {
      if(err) return done(err);

      // Associate socket with troupe
      presenceService.userSubscribedToTroupe(userId, troupeId, socketId, function(err) {
        if(err) return done(err);

        var signals = [1,0,1,0,1,1,1,1,0,0,0,1];

        function doNext() {
          if(signals.length <= 0) return done();
          var signal = signals.shift();

          presenceService.clientEyeballSignal(userId, socketId, signal, function(err) {
            assertUserTroupeStatus(signal, function(err, done) {
              if(err) return done(err);
              doNext();
            });
          });
        }
        doNext();

      });
    });

  });
});

