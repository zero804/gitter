/*jshint globalstrict:true, trailing:false, unused:true, node:true */
/*global describe:true, it:true*/
"use strict";

var testRequire = require('./../test-require');

var userSearchService = testRequire('./services/user-search-service');
var persistence = testRequire('./services/persistence-service');

var assert = require('assert');

describe("User Search Service", function() {

  describe("#createRegExpsForQuery", function() {
    it("should create a single regexp for a single word search", function() {

      var res = userSearchService.testOnly.createRegExpsForQuery("Frodo");

      assert(res.length === 1, 'Expected a single regular expression');
      assert.strictEqual(res[0].toString(), "/\\bfrodo/i", 'Expected the search');

    });

    it("should create a double regexp for a double word search", function() {

      var res = userSearchService.testOnly.createRegExpsForQuery("Frodo Baggins");

      assert(res.length === 2, 'Expected a single regular expression');
      assert.strictEqual(res[0].toString(), "/\\bfrodo/i", 'Expected the search');
      assert.strictEqual(res[1].toString(), "/\\bbaggins/i", 'Expected the search');

    });


    it("should handle irish names", function() {
      var res = userSearchService.testOnly.createRegExpsForQuery("Frodo O'Grady");

      assert(res.length === 3, 'Expected a single regular expression');
      assert.strictEqual(res[0].toString(), "/\\bfrodo/i", 'Expected the search');
      assert.strictEqual(res[1].toString(), "/\\bo/i", 'Expected the search');
      assert.strictEqual(res[2].toString(), "/\\bgrady/i", 'Expected the search');
    });


    it("should handle numbers", function() {
      var res = userSearchService.testOnly.createRegExpsForQuery("Test User 1");
      assert(res.length === 3, 'Expected a three regular expression');
      assert.strictEqual(res[0].toString(), "/\\btest/i", 'Expected the search');
      assert.strictEqual(res[1].toString(), "/\\buser/i", 'Expected the search');
      assert.strictEqual(res[2].toString(), "/\\b1/i", 'Expected the search');
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
          assert(searchResults.results.length >= 2, "Expect two user");

          assert(searchResults.results.filter(function(f) { return f.displayName === 'Test User 1'; } ).length == 1, "Expect test user 1");
          assert(searchResults.results.filter(function(f) { return f.displayName === 'Test User 2'; } ).length == 1, "Expect test user 2");

          return done();
        });
      });

    });

    it("should find one Test User 1", function(done) {
      persistence.User.findOne({ email: "testuser@troupetest.local" }, function(err, user) {
        if(err) return done(err);
        if(!user) return done("Cannot find user");

        var userId = user.id;

        userSearchService.searchForUsers(userId, 'tEst user 1', {}, function(err, searchResults) {
          if(err) return done(err);

          assert(searchResults.results.length === 1, "Expect one user");
          return done();
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