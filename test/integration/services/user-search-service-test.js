/*jshint globalstrict:true, trailing:false, unused:true, node:true */
/*global describe:true, it:true*/
"use strict";

var testRequire = require('./../test-require');
//var logAccess = require("../log-access");
//var userSearchService = logAccess(testRequire('./services/user-search-service'));


var userSearchService = testRequire('./services/user-search-service');
var persistence = testRequire('./services/persistence-service');

var assert = require('assert');

describe("User Search Service", function() {

  describe("#createRegExpsForQuery", function() {
    it("should create a single regexp for a single word search", function() {

      userSearchService.testOnly.createRegExpsForQuery("Frodo")
        .then(function(res) {

          assert(res.length === 1, 'Expected a single regular expression');
          assert.strictEqual(res[0].toString(), "/\\bfrodo/i", 'Expected the search');

        });

    });

    it("should create a double regexp for a double word search", function() {

      userSearchService.testOnly.createRegExpsForQuery("Frodo Baggins")
        .then(function(res) {

          assert(res.length === 2, 'Expected a single regular expression');
          assert.strictEqual(res[0].toString(), "/\\bfrodo/i", 'Expected the search');
          assert.strictEqual(res[1].toString(), "/\\bbaggins/i", 'Expected the search');

        });


    });


    it("should handle irish names", function() {
      userSearchService.testOnly.createRegExpsForQuery("Frodo O'Grady")
        .then(function(res) {

          assert(res.length === 3, 'Expected three regular expressions');
          assert.strictEqual(res[0].toString(), "/\\bfrodo/i", 'Expected the search');
          assert.strictEqual(res[1].toString(), "/\\bo/i", 'Expected the search');
          assert.strictEqual(res[2].toString(), "/\\bgrady/i", 'Expected the search');

        });

    });


    it("should handle numbers", function() {
      userSearchService.testOnly.createRegExpsForQuery("Test User 1")
        .then(function(res) {

          assert(res.length === 3, 'Expected a three regular expression');
          assert.strictEqual(res[0].toString(), "/\\btest/i", 'Expected the search');
          assert.strictEqual(res[1].toString(), "/\\buser/i", 'Expected the search');
          assert.strictEqual(res[2].toString(), "/\\b1/i", 'Expected the search');

        });

    });

  });

  describe("#searchForUsers", function() {

    it("should find both test users", function(done) {
      persistence.User.findOne({ email: "testuser@troupetest.local" }, function(err, user) {
        if(err) return done(err);
        if(!user) return done("Cannot find user");

        var userId = user.id;

        userSearchService.searchForUsers(userId, 'tEst', {}, function(err, searchResults) {
          if(err) return done(err);
          assert(searchResults.results.length >= 2, "Expect some users");

          assert(searchResults.results.filter(function(f) { return f.displayName === 'Test User 1'; } ).length === 0, "Expect test user 1 not to be returned");
          assert(searchResults.results.filter(function(f) { return f.displayName === 'Test User 2'; } ).length == 1, "Expect test user 2");
          assert(searchResults.results.filter(function(f) { return f.displayName === 'Test User 3'; } ).length == 1, "Expect test user 3");

          return done();
        });
      });

    });

    it("should find one Test Users 2 and 3", function(done) {
      persistence.User.findOne({ email: "testuser@troupetest.local" }, function(err, user) {
        if(err) return done(err);
        if(!user) return done("Cannot find user");

        var userId = user.id;

        userSearchService.searchForUsers(userId, 'tEst user 2', {}, function(err, searchResults) {
          if(err) return done(err);

          assert(searchResults.results.length >= 1, "Expect one user: got " + searchResults.results.join(', '));
          assert(searchResults.results.filter(function(f) { return f.displayName === 'Test User 2'; } ).length == 1, "Expect test user 2");

          return done();
        });
      });

    });


    it("should not find test user three when a testtroupe3 is excluded", function(done) {
      persistence.Troupe.findOne({ uri: "testtroupe3" }, function(err, troupe) {
        if(err) return done(err);
        if(!troupe) return done("Cannot find testtroupe3 ");

        persistence.User.findOne({ email: "testuser@troupetest.local" }, function(err, user) {
          if(err) return done(err);
          if(!user) return done("Cannot find user");

          var userId = user.id;

          userSearchService.searchForUsers(userId, 'tEst user', { excludeTroupeId: troupe.id }, function(err, searchResults) {
            if(err) return done(err);

            assert(searchResults.results.filter(function(f) { return f.displayName === 'Test User 2'; } ).length === 1, "Expected to find test user 2");
            assert(searchResults.results.filter(function(f) { return f.displayName === 'Test User 3'; } ).length === 0, "Expected to not find test user 3");

            return done();
          });
        });
      });

    });

    it("should not find an unknown users", function(done) {
      persistence.User.findOne({ email: "testuser@troupetest.local" }, function(err, user) {
        if(err) return done(err);
        if(!user) return done("Cannot find user");

        var userId = user.id;

        userSearchService.searchForUsers(userId, 'Noddy Obama McBigbones', {}, function(err, searchResults) {
          if(err) return done(err);
          assert(searchResults.results.length === 0, "Expect no users");
          return done();
        });
      });

    });

  });


});