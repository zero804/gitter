/*jshint globalstrict:true, trailing:false, unused:true, node:true */
/*global describe:true, it:true, before:false, after:false */
'use strict';

var testRequire = require('./../test-require');
var fixtureLoader = require('../test-fixtures');

var assert = require('assert');

describe('Suggested Contact Service', function() {
  describe('fetchSuggestedContactsForUser', function() {
    var fixture = {};

    var email = fixtureLoader.generateEmail();

    before(fixtureLoader(fixture, {
      user1: { },
      user2: { username: true },
      user3: { email: email },
      user4: { },
      contact1: {
        user: 'user4',
        name: 'Mauro Pompilio',
        contactUser: 'user3',
        emails: [email],
        source: 'google'
      },
      troupe1: { users: ['user1', 'user2' ] }
    }));

    it('should suggest contacts in shared troupes', function(done) {
      var user = fixture.user1;

      var underTest = testRequire('./services/suggested-contacts-service');

      return underTest.fetchSuggestedContactsForUser(user.id, { })
        .then(function(results) {
          assert.equal(results.limit, 20);
          assert.strictEqual(results.skip, 0);
          assert.equal(results.results.length, 1);

          var result = results.results[0];
          assert.equal(result.emails.length, 1);
          assert.equal(result.emails[0], fixture.user2.email);
          assert.equal(result.contactUserId, fixture.user2.id);
          assert.equal(result.name, fixture.user2.displayName);
          assert.equal(result.username, fixture.user2.username);
        })
        .nodeify(done);
    });


    it('should suggest contacts from your imported contacts', function(done) {

      var underTest = testRequire('./services/suggested-contacts-service');

      return underTest.fetchSuggestedContactsForUser(fixture.user4.id, { })
        .then(function(results) {
          assert.equal(results.limit, 20);
          assert.strictEqual(results.skip, 0);
          assert.equal(results.results.length, 1);

          var result = results.results[0];
          assert.equal(result.emails.length, 1);
          assert.equal(result.emails[0], fixture.user3.email);
          assert.equal(result.contactUserId, fixture.user3.id);
        })
        .nodeify(done);
    });


    it('should suggest users who have imported you into their contacts', function(done) {

      var underTest = testRequire('./services/suggested-contacts-service');

      return underTest.fetchSuggestedContactsForUser(fixture.user3.id, { })
        .then(function(results) {
          assert.equal(results.limit, 20);
          assert.strictEqual(results.skip, 0);
          assert.equal(results.results.length, 1);

          var result = results.results[0];
          assert.equal(result.emails.length, 1);
          assert.equal(result.emails[0], fixture.user4.email);
          assert.equal(result.contactUserId, fixture.user4.id);
        })
        .nodeify(done);
    });

    after(function() {
      fixture.cleanup();
    });

  });

});
