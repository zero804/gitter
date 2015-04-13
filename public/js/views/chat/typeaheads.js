"use strict";

var isMobile = require('utils/is-mobile');
var apiClient = require('components/apiClient');
var listItemTemplate = require('./tmpl/typeaheadListItem.hbs');
var emojiListItemTemplate = require('./tmpl/emojiTypeaheadListItem.hbs');
var context = require('utils/context');
var commands = require('./commands');
var cdn = require('utils/cdn');

var MAX_TYPEAHEAD_SUGGESTIONS = isMobile() ? 3 : 10;
var SUGGESTED_EMOJI = ['smile', 'worried', '+1', '-1', 'fire', 'sparkles', 'clap', 'shipit'];

var issues = {
  match: /(^|\s)(([\w-_]+\/[\w-_]+)?#(\d*))$/,
  maxCount: MAX_TYPEAHEAD_SUGGESTIONS,
  search: function (term, callback) {
    var terms = term.split('#');
    var repoName = terms[0];
    var issueNumber = terms[1];
    var query = {};

    if(repoName) query.repoName = repoName;
    if(issueNumber) query.issueNumber = issueNumber;

    apiClient.room.get('/issues', query)
      .then(function(resp) {
        callback(resp);
      })
      .fail(function() {
        callback([]);
      });
  },
  template: function(issue) {
    return listItemTemplate({
      name: issue.number,
      description: issue.title
    });
  },
  replace: function(issue) {
    return '$1$3#' + issue.number + ' ';
  }
};

var users = {
  match: /(^|\s)@(\/?[a-zA-Z0-9_\-]*)$/,
  maxCount: MAX_TYPEAHEAD_SUGGESTIONS,
  search: function (term, callback) {
    apiClient.room.get('/users', { q: term })
      .then(function(users) {
        var lowerTerm = term.toLowerCase();
        var loggedInUsername = context.user().get('username').toLowerCase();

        users = users.filter(function(user) {
          // do not include the current user in the matches
          return user.username !== loggedInUsername;
        });

        if(context().permissions.admin && !lowerTerm || '/all'.indexOf(lowerTerm) === 0) {
          // This is a bit of a hack for now
          users.unshift({ username: '/all', displayName: 'Group' });
        }

        callback(users);
      })
      .fail(function() {
        callback([]);
      });
  },
  template: function(user) {
    return listItemTemplate({
      name: user.username,
      description: user.displayName
    });
  },
  replace: function(user) {
    return '$1@' + user.username + ' ';
  }
};

var emoji = {
  match: /(^|\s):([\-+\w]*)$/,
  maxCount: MAX_TYPEAHEAD_SUGGESTIONS,
  search: function(term, callback) {
    if(term.length < 1) return callback(SUGGESTED_EMOJI);

    var matches = emoji.named.filter(function(emoji) {
      return emoji.indexOf(term) === 0;
    });
    callback(matches);
  },
  template: function(emoji) {
    return emojiListItemTemplate({
      emoji: emoji,
      emojiUrl: cdn('images/emoji/' + emoji + '.png')
    });
  },
  replace: function (value) {
    return '$1:' + value + ': ';
  }
};

var inputCommands = {
  match: /(^)\/(\w*)$/,
  maxCount: commands.size,
  search: function(term, callback) {
    var matches = commands.getSuggestions(term);
    callback(matches);
  },
  template: function(cmd) {
    return listItemTemplate({
      name: cmd.command,
      description: cmd.description
    });
  },
  replace: function (cmd) {
    return '$1/' + cmd.completion;
  }
};

module.exports = [ issues, users, emoji, inputCommands ];
