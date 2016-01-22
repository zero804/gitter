/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert                    = require('assert');
var _                         = require('underscore');
var suggestedOrgsFromRoomList = require('../../../../shared/orgs/suggested-orgs-from-room-list');

describe('suggestedOrgsFromRoomList', function() {

  var rooms = [
    { url: 'gitterHQ', githubType: 'ORG', favourite: 1 },
    { url: 'troupe', githubType: 'ORG' },
    { url: 'gitterHQ/test1', githubType: 'ORG_CHANNEL', favourite: 2 },
    { url: 'gitterHQ/test2', githubType: 'ORG_CHANNEL' },
    { url: 'troupe/test1', githubType: 'ORG_CHANNEL', favourite: 3 },
    { url: 'troupe/test2', githubType: 'ORG_CHANNEL' },
    { url: 'troupe/test2', githubType: 'ORG_CHANNEL' },
    { url: 'troupe/test2', githubType: 'ORG_CHANNEL' },
    { url: 'someuserurl', githubType: 'ONETOONE' },
    { url: 'someotheruserurl', githubType: 'ONETOONE', favourite: 4 },
    { url: 'userurl', githubType: 'ONETOONE' },
    { url: 'someorg/somerepo', githubType: 'REPO' },
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
