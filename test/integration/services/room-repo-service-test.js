"use strict";

var testRequire = require('../test-require');
var fixtureLoader = require('gitter-web-test-utils/lib/test-fixtures');
var assert = require('assert');

describe('room-repo-service #slow', function(){
  var roomRepoService;

  var fixture = fixtureLoader.setup({
    troupe1: {},
    troupe2: {},
    troupe3: {},
    troupe4: {
      group: 'group1'
    },
    group1: {
      securityDescriptor: {
        type: 'GH_REPO',
        admins: 'GH_REPO_PUSH',
        linkPath: 'x/y'
      }
    },
    troupe5: {
      securityDescriptor: {
        type: 'GH_REPO',
        admins: 'GH_REPO_PUSH',
        linkPath: '1/2'
      }
    },
    troupe6: {
      securityDescriptor: {
        type: 'GH_REPO',
        admins: 'GH_REPO_PUSH',
        linkPath: '3/4'
      },
      group: 'group1'
    },

  });

  before(function() {
    roomRepoService = testRequire('./services/room-repo-service');
  });

  describe('findAssociatedGithubRepoForRooms', function() {
    it('should deal with no rooms', function() {
      return roomRepoService.findAssociatedGithubRepoForRooms([])
        .then(function(result) {
          assert.deepEqual(result, {});
        });
    });

    it('should deal with one room, not successful', function() {
      return roomRepoService.findAssociatedGithubRepoForRooms([fixture.troupe1])
        .then(function(result) {
          assert.deepEqual(result, {});
        });
    });

    it('should deal with one room, successful', function() {
      return roomRepoService.findAssociatedGithubRepoForRooms([fixture.troupe4])
        .then(function(result) {
          var expected = [];
          expected[fixture.troupe4.id] = 'x/y';
          assert.deepEqual(result, expected);
        });
    });

    it('should deal with many rooms', function() {
      return roomRepoService.findAssociatedGithubRepoForRooms([fixture.troupe1, fixture.troupe2, fixture.troupe3])
        .then(function(result) {
          assert.deepEqual(result, {});
        });
    });

    it('should deal with mixed rooms', function() {
      return roomRepoService.findAssociatedGithubRepoForRooms([fixture.troupe1, fixture.troupe4])
        .then(function(result) {
          var expected = [];
          expected[fixture.troupe4.id] = 'x/y';
          assert.deepEqual(result, expected);
        });
    });

    it('should deal with mixed rooms, 2', function() {
      return roomRepoService.findAssociatedGithubRepoForRooms([fixture.troupe1, fixture.troupe4, fixture.troupe5, fixture.troupe6])
        .then(function(result) {
          var expected = [];
          expected[fixture.troupe4.id] = 'x/y';
          expected[fixture.troupe5.id] = '1/2';
          expected[fixture.troupe6.id] = '3/4';
          assert.deepEqual(result, expected);
        });
    });
  });

});
