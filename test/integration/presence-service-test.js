/*jslint node: true */
/*global describe:true, it: true */
"use strict";

var presenceService = require('../../server/services/presence-service');

var assert = require("better-assert");
var winston = require("../../server/utils/winston");

var fakeEngine = {
  clientExists: function(clientId, callback) { callback(!clientId.match(/^TEST/)); }
};

describe('presenceService', function() {
  describe('#userSocketConnected()', function() {
    it('users presence should appear and disappear as expected', function(done) {
      var userId = 'TESTUSER1';
      var socketId = 'TESTSOCKET1';
      var troupeId = 'TESTTROUPE1';

      // Do a pre-test cleanup
      presenceService.validateActiveSockets(fakeEngine, function(err) {

        // Make sure things are clean
        presenceService.findOnlineUsersForTroupe(troupeId, function(err, users) {

          // User should not exist
          assert(users.every(function(id) { return id !== userId; }), 'Expected user _not_ to be online at beginning of test');

          // Connect the socket
          presenceService.userSocketConnected(userId, socketId, function(err) {

            if(err) return done(err);

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
});
