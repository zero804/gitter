'use strict';

var _ = require('underscore');
var Promise = require('bluebird');

var HIGHLIGHTED_ROOMS = [
  {
    uri: 'gitterHQ/gitter',
    githubType: 'REPO',
    localeLanguage: 'en',
    roomExists: true,
    highlighted: true
  }, {
    uri: 'marionettejs/backbone.marionette',
    language: 'JavaScript',
    githubType: 'REPO',
    localeLanguage: 'en',
    roomExists: true,
    highlighted: true
  },{
    uri: 'LaravelRUS/chat',
    language: 'PHP',
    githubType: 'REPO',
    localeLanguage: 'ru',
    roomExists: true,
    highlighted: true
  }, {
    uri: 'gitterHQ/nodejs',
    language: 'JavaScript',
    githubType: 'ORG_CHANNEL',
    localeLanguage: 'en',
    roomExists: true,
    highlighted: true
  },{
    uri: 'FreeCodeCamp/FreeCodeCamp',
    language: 'JavaScript',
    githubType: 'REPO',
    localeLanguage: 'en',
    roomExists: true,
    highlighted: true
  }, {
    uri: 'webpack/webpack',
    language: 'JavaScript',
    githubType: 'REPO',
    localeLanguage: 'en',
    roomExists: true,
    highlighted: true
  }, {
    uri: 'angular-ui/ng-grid',
    language: 'JavaScript',
    githubType: 'REPO',
    localeLanguage: 'en',
    roomExists: true,
    highlighted: true
  }
];

module.exports = function (/*userId, currentRoomUri*/) {
  return Promise.all(HIGHLIGHTED_ROOMS.map(function(recommendation) {
    // if (recommendation.githubType === 'REPO') {
    //   return highlightedRoomCache(null, recommendation.uri)
    //     .then(function(repo) {
    //       return _.extend({ }, recommendation, { githubRepo: repo });
    //     });
    // }

    return _.extend({ roomExists: true, highlighted: true }, recommendation);
  }));
};
