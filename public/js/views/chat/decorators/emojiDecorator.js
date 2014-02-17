/* jshint unused:true, browser:true,  strict:true */
/* global define:false */
define(['utils/emoji', 'utils/cdn'], function(emoji, cdn) {

  "use strict";

  var ignoredTags = {
    'SCRIPT': 1,
    'TEXTAREA': 1,
    'A': 1,
    'PRE': 1,
    'CODE': 1
  };

  function findText(element, pattern, callback, validator) {
    var treeWalker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: function(node) {
          if(node.nodeType !== 1) return NodeFilter.FILTER_ACCEPT;

          if(ignoredTags[node.tagName] || node.classList.contains('no-emojify')) {
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_SKIP;
        }
      },
      false
    );

    var nodeList = [];

    while(treeWalker.nextNode()) {
      nodeList.push(treeWalker.currentNode);
    }

    nodeList.forEach(function(node) {
      var match;
      var matches = [];
      while (match = pattern.exec(node.data)) {
        if(validator(match)) {
          matches.push(match);
        }
      }

      for (var i = matches.length; i-- > 0;) {
        callback(node, matches[i]);
      }
    });
  }

  function isWhitespace(s) {
    return s === ' ' || s === '\t' || s === '\r' || s === '\n' || s === '';
  }

  function insertEmojicon(node, match, emojiName) {
    var emojiImg = document.createElement('img');
    emojiImg.setAttribute('title', ':' + emojiName + ':');
    emojiImg.setAttribute('class', 'emoji');
    emojiImg.setAttribute('src', cdn('images/2/gitter/emoji/' + emojiName + '.png'));
    emojiImg.setAttribute('align', 'absmiddle');

    node.splitText(match.index);
    node.nextSibling.nodeValue = node.nextSibling.nodeValue.substr(match[0].length, node.nextSibling.nodeValue.length);
    emojiImg.appendChild(node.splitText(match.index));
    node.parentNode.insertBefore(emojiImg, node.nextSibling);
  }

  var namedMatchHash = emoji.named.reduce(function(memo, v) {
    memo[v] = true;
    return memo;
  }, {});

  function getEmojiNameForMatch(match) {
    /* Special case for named emoji */
    if(match[1] && match[2]) {
      var named = match[2];
      if(namedMatchHash[named]) return named;
      return;
    }

    for(var i = 3; i < match.length - 1; i++) {
      if(match[i]) {
        return emoji.emoticons[i - 2][1];
      }
    }
  }

  function run(el) {
    var lastEmojiTerminatedAt = -1;

    // Search for emoticons
    findText(el, emoji.emojiMegaRe, function (node, match) {
      /* Replacer */
      var emojiName = getEmojiNameForMatch(match);
      insertEmojicon(node, match, emojiName);
    }, function(match) {
      /* Validator */
      var emojiName = getEmojiNameForMatch(match);
      if(!emojiName) return;

      var m = match[0];
      var index = match.index;
      var input = match.input;

      function success() {
        lastEmojiTerminatedAt = m.length + index;
        return true;
      }

      /* Any smiley thats 3 chars long is probably a smiley */
      if(m.length > 2) return success();

      /* At the beginning? */
      if(index === 0) return success();

      /* At the end? */
      if(input.length === m.length + index) return success();

      /* Has a whitespace before? */
      if(isWhitespace(input.charAt(index - 1))) return success();

      /* Has a whitespace after? */
      if(isWhitespace(input.charAt(m.length + index))) return success();

      /* Has an emoji before? */
      if(lastEmojiTerminatedAt === index) return success();

      return false;
    });

  }


  var decorator = {
    decorate: function(chatItemView) {
       run(chatItemView.$el.find('.trpChatText')[0]);
    }
  };

  return decorator;

});
