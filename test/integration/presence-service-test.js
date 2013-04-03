/*jslint node: true */
/*global describe:true, it: true */
"use strict";

var presenceService = require('../../server/services/presence-service');

var assert = require("better-assert");
var winston = require("../../server/utils/winston");
var Q = require("q");

var fakeEngine = {
  clientExists: function(clientId, callback) { callback(!clientId.match(/^TEST/)); }
};


function cleanup(done, next) {
  presenceService.validateActiveUsers(fakeEngine, function(err) {
    if(err) return done(err);

    // Do a pre-test cleanup
    presenceService.validateActiveSockets(fakeEngine, function(err) {
      if(err) return done(err);

      return next();
    });
  });
}

describe('presenceService', function() {
  describe('#userSocketConnected()', function() {
    it('users presence should appear and disappear as expected', function(done) {
      var userId = 'TESTUSER1';
      var socketId = 'TESTSOCKET1';
      var troupeId = 'TESTTROUPE1';

      // Make sure things are cleaned up pre-test
      cleanup(done, function(err) {

        // Make sure things are clean
        presenceService.findOnlineUsersForTroupe(troupeId, function(err, users) {
          if(err) return done(err);

          // User should not exist
          assert(users.every(function(id) { return id !== userId; }), 'Expected user _not_ to be online at beginning of test');

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
                  presenceService.socketDisconnected(socketId, { immediate: true }, function(err) {
                    if(err) return done(err);

                    // Check if the user is still in the troupe
                    presenceService.findOnlineUsersForTroupe(troupeId, function(err, users) {
                      if(err) return done(err);

                      var notThere = (!users.length || users.every(function(id) { return id !== userId; }));

                      assert(notThere, 'Expect user to be offline');

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

    it('should handle very quick connect/disconnect cycles when the user connects to a troupe', function(done) {

      // Make sure things are cleaned up pre-test
      cleanup(done, function(err) {
        var socketId = 'FAKE_SOCKET_' + Math.floor(Math.random() * 1000000);
        var userId = 'TESTUSER1';
        var troupeId = 'TESTTROUPE2';

        var d1 = Q.defer();
        var d2 = Q.defer();

        // This simulates three events happening in very quick succession
        presenceService.socketDisconnected(socketId, { immediate: true }, d2.makeNodeResolver());
        presenceService.userSocketConnected(userId, socketId, function(err) {
          if(err) { return d1.reject(); }

          presenceService.userSubscribedToTroupe(userId, troupeId, socketId, d1.makeNodeResolver());
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

    });
  });
});

