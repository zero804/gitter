'use strict';

var debug = require('debug')('gitter:modules:twitter:badger');
var Promise = require('bluebird');
var env = require('gitter-web-env');
var config = env.config;
var TwitterService = require('./twitter-service');
var StatusError = require('statuserror');

var TWEET_MAX_CHARACTER_LIMIT = 140;

var CONSUMER_KEY = config.get('twitterbadger:consumer_key');
var CONSUMER_SECRET = config.get('twitterbadger:consumer_secret');
var BADGER_ACCESS_TOKEN = config.get('twitterbadger:access_token');
var BADGER_ACCESS_TOKEN_SECRET = config.get('twitterbadger:access_token_secret');

var twitterService = new TwitterService(CONSUMER_KEY, CONSUMER_SECRET, BADGER_ACCESS_TOKEN, BADGER_ACCESS_TOKEN_SECRET);

var alwaysAllowedUsernames = [
  'gitchat',
  'WeAreTroupe',
  'GitterBadger',
  'mydigitalself',
  'suprememoocow',
  'trevorah_',
  'MadLittleMods',
  '__leroux',
  'CutAndPastey',
  'escociao',
  'koholaa',
  'NeverGitter'
];

var userFilter = function(user) {
  if(process.env.NODE_ENV === 'prod') {
    return true;
  }

  // Some mocked users
  if(/GitterTestUser/.test(user.twitterUsername)) {
    return true;
  }

  var lcUsername = (user.twitterUsername || '').toLowerCase();

  // We don't want to bother other users when testing (non-prod)
  return alwaysAllowedUsernames.some(function(alwaysAllowedUsername) {
    return lcUsername === alwaysAllowedUsername.toLowerCase();
  });
};


function sendUserInviteTweets(invitingUser, users, name, url) {
  if(!invitingUser) {
    return Promise.reject(new Error('No user provided to show as the person inviting other users'));
  }

  if(!url) {
    return Promise.reject(new Error('No url provided to point users to'));
  }

  var mentionList = [];
  users
    .filter(userFilter)
    .forEach(function(user) {
      if(user.twitterUsername) {
        mentionList.push('@' + user.twitterUsername);
      }
    });

  debug((invitingUser && invitingUser.username) + ' is inviting ' + mentionList.length + ' people via the Twitter Badger');

  if(invitingUser && mentionList.length > 0) {
    var invitingUserName = invitingUser.twitterUsername ? ('@' + invitingUser.twitterUsername) : invitingUser.username;

    var baseMessagePre = 'Hey ';
    var baseMessagePost = ' you\'ve been invited to the ' + name + ' community by ' + invitingUserName + '.\n' + url;
    var baseMessageLength = baseMessagePre.length + baseMessagePost.length;

    // Split up the mentions into multiple tweets if necessary
    var mentionStringBuckets = [''];
    mentionList.forEach(function(mention) {
      var currentMentionString = mentionStringBuckets[mentionStringBuckets.length - 1];
      if(baseMessageLength + currentMentionString.length > TWEET_MAX_CHARACTER_LIMIT) {
        mentionStringBuckets.push('');
        currentMentionString = '';
      }

      mentionStringBuckets[mentionStringBuckets.length - 1] = (currentMentionString ? (currentMentionString + ' ') : '') + mention;
    });

    debug('Sending ' + mentionStringBuckets.length + ' invite tweets');

    return Promise.all(mentionStringBuckets.map(function(mentionString) {
      var message = baseMessagePre + mentionString + baseMessagePost;
      return twitterService.sendTweet(message)
        .then(function(res) {
          if(res.statusCode === 200) {
            return message;
          }

          var errorString = 'Status: ' + res.statusCode + ' -- ' + (res.body.errors || []).reduce(function(errorString, error) {
            return errorString + (errorString.length > 0 ? ' -- ' : '') + error.code + ' ' + error.message;
          }, '');

          throw new StatusError(400, errorString);
        });
    }));
  }

  return Promise.resolve([]);
}


module.exports = {
  sendUserInviteTweets: sendUserInviteTweets
};
