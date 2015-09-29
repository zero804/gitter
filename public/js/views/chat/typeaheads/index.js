"use strict";

var issueTypeahead = require('./issue-typeahead');
var userTypeahead = require('./user-typeahead');
var emojiTypeahead = require('./emoji-typeahead');
var commandTypeahead = require('./command-typeahead');

module.exports = function() {
  return [
    issueTypeahead(),
    userTypeahead(),
    emojiTypeahead(),
    commandTypeahead()
  ];
};
