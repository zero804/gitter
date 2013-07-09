

var testRequire = require('./test-require');

var Q = require("q");
var assert = require("assert");
var persistence = testRequire("./services/persistence-service");
var _ = require('underscore');
var assert = require('assert');

function load(done) {

  function only(a) {
    assert(a.length, "Fixture data is missing");
    assert(a.length == 1, "Multiple fixture data items found. Expected exactly one: " + JSON.stringify(a));
    return a[0];
  }

  var fixture = {};

  Q.all([
      persistence.User.findQ({ email: 'testuser@troupetest.local' }).then(only).then(function(user) { fixture.user1 = user; }),
      persistence.User.findQ({ email: 'testuser2@troupetest.local' }).then(only).then(function(user) { fixture.user2 = user; }),
      persistence.User.findQ({ email: 'testuserwithnotroupes@troupetest.local' }).then(only).then(function(user) { fixture.userNoTroupes = user; }),
      persistence.Troupe.findQ({ uri: 'testtroupe1' }).then(only).then(function(troupe) { fixture.troupe1 = troupe; }),
      persistence.Troupe.findQ({ uri: 'testtroupe2' }).then(only).then(function(troupe) { fixture.troupe2 = troupe; })
    ])
    .then(function() {
      assert(fixture.troupe1.containsUserId(fixture.user1.id), 'Test data is broken. User1 should be in troupe1. Troupe1 contains: ' + fixture.troupe1.users.join(','));
      assert(fixture.troupe1.containsUserId(fixture.user2.id), 'Test data is broken. User1 should be in troupe1');

      assert(!fixture.troupe1.containsUserId(fixture.userNoTroupes.id), 'Test data is broken. userNoTroupes should not be in troupe1');
      assert(!fixture.troupe2.containsUserId(fixture.userNoTroupes.id), 'Test data is broken. userNoTroupes should not be in troupe1');

      assert(fixture.troupe2.users.length === 0, 'Fixture error: troupe2 should not contain any users');

      var counter = 0;
      return _.extend(fixture, {
          generateEmail: function() {
            return 'testuser' + (++counter) + Date.now() + '@troupetest.local';
          },
          generateName: function() {
            return 'Test ' + (++counter) + ' ' + Date.now();
          }
        });
    })
    .nodeify(done);

}


module.exports = function(fixture) {
  return function(done) {
     load(function(err, data) {
       if(err) return done(err);

       Object.keys(data).forEach(function(key) {
        fixture[key] = data[key];
       });

       done();
     });

   };
};