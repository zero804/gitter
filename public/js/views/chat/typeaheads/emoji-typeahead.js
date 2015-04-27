"use strict";

var isMobile = require('utils/is-mobile');
var emoji = require('utils/emoji');
var cdn = require('utils/cdn');
var template = require('./tmpl/emoji-typeahead.hbs');

var MAX_TYPEAHEAD_SUGGESTIONS = isMobile() ? 3 : 10;
var SUGGESTED_EMOJI = ['smile', 'worried', '+1', '-1', 'fire', 'sparkles', 'clap', 'shipit'];

module.exports = {
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
    return template({
      emoji: emoji,
      emojiUrl: cdn('images/emoji/' + emoji + '.png')
    });
  },
  replace: function (value) {
    return '$1:' + value + ': ';
  }
};
