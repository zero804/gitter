/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert = require('assert');
var _ = require('underscore');
var suggestedOrgsFromRoomList = require('../../../../shared/orgs/suggested-orgs-from-room-list');

describe('suggestedOrgsFromRoomList', function() {

  var rooms = [
    { url: '/gitterHQ', githubType: 'ORG', favourite: 1, unreadItems: 2 },
    { url: '/troupe', githubType: 'ORG' },
    { url: '/gitterHQ/test1', githubType: 'ORG_CHANNEL', favourite: 2, unreadItems: 3 },
    { url: '/gitterHQ/test2', githubType: 'ORG_CHANNEL' },
    { url: '/troupe/test1', githubType: 'ORG_CHANNEL', favourite: 3 },
    { url: '/troupe/test2', githubType: 'ORG_CHANNEL', mentions: 2 },
    { url: '/troupe/test2', githubType: 'ORG_CHANNEL', mentions: 4 },
    { url: '/troupe/test2', githubType: 'ORG_CHANNEL' },
    { url: '/someuserurl', githubType: 'ONETOONE' },
    { url: '/someotheruserurl', githubType: 'ONETOONE', favourite: 4 },
    { url: '/userurl', githubType: 'ONETOONE' },
    { url: '/someorg/somerepo', githubType: 'REPO' },
  ];

  it('should contain no one-to-one rooms', function(){
    var orgs = suggestedOrgsFromRoomList(rooms);
    assert.equal(0, _.where(orgs, {name: 'someuser'}));
    assert.equal(0, _.where(orgs, {name: 'someotherusername'}));
    assert.equal(0, _.where(orgs, {name: 'username'}));
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

  it('should aggregate unread messages', function(){
    var orgs = suggestedOrgsFromRoomList(rooms);
    var gitter = _.where(orgs, { name: 'gitterHQ' })[0];
    assert.equal(5, gitter.unreadItems);
  });

  it('should aggregate mentions', function(){
    var orgs = suggestedOrgsFromRoomList(rooms);
    var troupe = _.where(orgs, { name: 'troupe' })[0];
    assert.equal(6, troupe.mentions);
  });

});
