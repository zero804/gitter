/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert                    = require('assert');
var _                         = require('underscore');
var suggestedOrgsFromRoomList = require('../../../../shared/orgs/suggested-orgs-from-room-list');

describe('suggestedOrgsFromRoomList', function() {

  var rooms = [
    { name: 'gitterHQ', githubType: 'ORG', favourite: 1 },
    { name: 'troupe', githubType: 'ORG' },
    { name: 'gitterHQ/test1', githubType: 'ORG_CHANNEL', favourite: 2 },
    { name: 'gitterHQ/test2', githubType: 'ORG_CHANNEL' },
    { name: 'troupe/test1', githubType: 'ORG_CHANNEL', favourite: 3 },
    { name: 'troupe/test2', githubType: 'ORG_CHANNEL' },
    { name: 'troupe/test2', githubType: 'ORG_CHANNEL' },
    { name: 'troupe/test2', githubType: 'ORG_CHANNEL' },
    { name: 'someusername', githubType: 'ONETOONE' },
    { name: 'someotherusername', githubType: 'ONETOONE', favourite: 4 },
    { name: 'username', githubType: 'ONETOONE' },
    { name: 'someorg/somerepo', githubType: 'REPO' },
  ];

  it('should contain no one-to-one rooms', function(){
    var orgs = suggestedOrgsFromRoomList(rooms);
    assert.equal(0, _.where(orgs, {name: 'someuser'}));
    assert.equal(0, _.where(orgs, {name: 'someotherusername'}));
    assert.equal(0, _.where(orgs, {name: 'username'}));
  });

  it('should contain no repo rooms', function(){
    var orgs = suggestedOrgsFromRoomList(rooms);
    assert.equal(0, _.where(orgs, {name: 'someorg'}));
  });

  it('should contain no entries that have a / in the name', function(){
    var orgs = suggestedOrgsFromRoomList(rooms);
    orgs.forEach(function(org){
      assert.ok(!/\//.test(org.name));
    });
  });

  it('should contain no duplicates', function(){
    var orgs = suggestedOrgsFromRoomList(rooms);
    var result = _.pluck(orgs, 'name');
    var expected = _.uniq(result);
    assert.deepEqual(expected, result);
  });

});
