

var testRequire = require('./test-require');

var Q = require("Q");
var assert = require("assert");
var persistence = testRequire("./services/persistence-service");
var _ = require('underscore');

function load(done) {

  function checkNotNull(a) {
    assert(a, "Fixture data is missing");
    return a;
  }

  var fixture = {};

  Q.all([
      persistence.User.findOneQ({ email: 'testuser@troupetest.local' }).then(checkNotNull).then(function(user) { fixture.user1 = user; }),
      persistence.User.findOneQ({ email: 'testuser2@troupetest.local' }).then(checkNotNull).then(function(user) { fixture.user2 = user; }),
      persistence.User.findOneQ({ email: 'testuserwithnotroupes@troupetest.local' }).then(checkNotNull).then(function(user) { fixture.userNoTroupes = user; }),
      persistence.Troupe.findOneQ({ uri: 'testtroupe1' }).then(checkNotNull).then(function(troupe) { fixture.troupe1 = troupe; }),
      persistence.Troupe.findOneQ({ uri: 'testtroupe2' }).then(checkNotNull).then(function(troupe) { fixture.troupe2 = troupe; })
    ])
    .then(function() {
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