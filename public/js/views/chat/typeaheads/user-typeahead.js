"use strict";

var isMobile = require('utils/is-mobile');
var context = require('utils/context');
var apiClient = require('components/apiClient');
var chatCollection = require('collections/instances/integrated-items').chats;
var template = require('./tmpl/typeahead.hbs');
var _ = require('underscore');

var MAX_TYPEAHEAD_SUGGESTIONS = isMobile() ? 3 : 10;

var lcUsername = (context.user() && context.user().get('username') || '').toLowerCase();

function getRecentMessageSenders() {
  var users = chatCollection.map(function(message) {
    return message.get('fromUser');
  }).filter(function(user) {
    return !!user;
  });

  return _.unique(users, function(user) { return user.id }).reverse();
}

function isNotCurrentUser(user) {
  return user.username.toLowerCase() !== lcUsername;
}

var lastTerm;
var lastCallback;
var debounceCallback;

// the textcomplete library requires *all* async
// functions to call their callback.
//
// So debouncing has to be custom.
function userSearchDebounced(term, callback) {
  if (lastCallback) {
    // kill the old callback
    lastCallback([]);
  }

  // long live the new callback!
  lastTerm = term;
  lastCallback = callback;

  if (!debounceCallback) {
    debounceCallback = setTimeout(function() {
      // allow new search to be debounced
      debounceCallback = null;

      // callback and term now belong to userSearch()
      var requestTerm = lastTerm;
      var requestCallback = lastCallback;
      lastTerm = null;
      lastCallback = null;

      userSearch(requestTerm, requestCallback);
    }, 500);    
  }
}

function userSearch(term, callback) {
  apiClient.room.get('/users', { q: term, limit: MAX_TYPEAHEAD_SUGGESTIONS })
    .then(function(users) {
      var lowerTerm = term.toLowerCase();

      users = users.filter(isNotCurrentUser);

      if (context().permissions.admin && '/all'.indexOf(lowerTerm) === 0) {
        users.unshift({ username: '/all', displayName: 'Group' });
      }

      callback(users);
    })
    .fail(function() {
      callback([]);
    });
}

module.exports = {
  match: /(^|\s)@(\/?[a-zA-Z0-9_\-]*)$/,
  maxCount: MAX_TYPEAHEAD_SUGGESTIONS,
  search: function (term, callback) {

    if (term.length === 0) {
      var users = getRecentMessageSenders();

      users = users.filter(isNotCurrentUser);

      if (context().permissions.admin) {
        // make sure that '@/all' is last
        users = users.slice(0, MAX_TYPEAHEAD_SUGGESTIONS - 1);
        users.push({ username: '/all', displayName: 'Group' });
      }

      return callback(users);
    }

    userSearchDebounced(term, callback);
  },
  template: function(user) {
    return template({
      name: user.username,
      description: user.displayName
    });
  },
  replace: function(user) {
    return '$1@' + user.username + ' ';
  }
};
