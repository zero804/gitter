/* global describe:true, it:true */
'use strict';

var assert = require('assert');
var testRequire = require('../test-require');

var TwitterBadger = testRequire('gitter-web-twitter/lib/twitter-badger');

var INVITING_USER = {
  username: 'gittertestbot',
  twitterUsername: 'GitterBadger'
};

var USERS_TO_INVITE = [
  { twitterUsername: 'GitterTestUser1' },
  { twitterUsername: 'GitterTestUser2' },
  { twitterUsername: 'GitterTestUser3' },
  { twitterUsername: 'GitterTestUser4' },
  { twitterUsername: 'GitterTestUser5' },
  { twitterUsername: 'GitterTestUser6' },
  { twitterUsername: 'GitterTestUser7' },
  { twitterUsername: 'GitterTestUser8' },
  { twitterUsername: 'GitterTestUser9' }
];

describe('twitter-badger #slow', function() {
  // Skip tests always unless specifically wanted because they create too much noise
  if(!process.env.RUN_TWITTER_BADGER_TESTS) return;

  it('should send a tweet with one person', function() {
    return TwitterBadger.sendUserInviteTweets(INVITING_USER, USERS_TO_INVITE.slice(0, 1), 'foo/bar')
      .then(function(results) {
        // Assert number of tweets
        assert.equal(results.length, 1);
      });
  });

  it('should send a tweet with multiple people', function() {
    return TwitterBadger.sendUserInviteTweets(INVITING_USER, USERS_TO_INVITE.slice(0, 2), 'foo/bar')
      .then(function(results) {
        // Assert number of tweets
        assert.equal(results.length, 1);
      });
  });

  it('should send multiple tweets if we can not fit everything in one tweet', function() {
    return TwitterBadger.sendUserInviteTweets(INVITING_USER, USERS_TO_INVITE, 'foo/bar')
      .then(function(results) {
        // Assert number of tweets
        assert.equal(results.length, 2);
        // Make sure the first user isn't in the second tweet
        assert.ok(results[1].indexOf(USERS_TO_INVITE[0]) === -1);
      });
  });

});
