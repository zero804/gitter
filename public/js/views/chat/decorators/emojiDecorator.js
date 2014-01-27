/* jshint unused:true, browser:true,  strict:true */
/* global define:false */
define(['utils/emoji', 'utils/cdn'], function(emoji, cdn) {

  "use strict";

  var ignoredClasses = {
    'no-emojify': 1
  };

  var ignoredTags = {
    'SCRIPT': 1,
    'TEXTAREA': 1,
    'A': 1,
    'PRE': 1,
    'CODE': 1
  };

  function isClassIgnored(c) {
    return !!ignoredClasses[c];
  }

  var emojify = (function () {

    // Helper function to find text within DOM
    var findText = function (element, pattern, callback, validator) {
      for (var childi = element.childNodes.length; childi-- > 0;) {
        var child = element.childNodes[childi];
        if (child.nodeType == 1) {

          if(ignoredTags[child.tagName]) continue;
          if (child.hasAttribute('class')) {
            var classnames = child.getAttribute('class').toLowerCase().split(/\s+/);
            if(classnames.some(isClassIgnored)) continue;
          }

          findText(child, pattern, callback);
        } else if (child.nodeType == 3) {
          var matches = [];
          if (typeof pattern === 'string') {
          } else {
            var match;
            while (match = pattern.exec(child.data)) {
              if(!validator || validator(match)) {
                matches.push(match);
              }
            }
          }

          for (var i = matches.length; i-- > 0;) {
            callback.call(window, child, matches[i]);
          }
        }
      }
    };

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

    var namedEmojiRegExp = /\:(\w+)\:/g;

    var namedMatchHash = emoji.named.reduce(function(memo, v) {
      memo[v] = true;
      return memo;
    }, {});

    function namedMatchValid(named) {
      return namedMatchHash[named];
    }

    function getEmojiNameForMatch(match) {
      for(var i = 1; i < match.length - 1; i++) {
        if(match[i]) {
          return emoji.emoticons[i - 1][1];
        }
      }
    }

    return {

      // Main method
      run: function (el) {
        // Search for named emoji
        findText(el, namedEmojiRegExp, function (node, match) {
          /* Replacer */
          insertEmojicon(node, match, match[1]);
        }, function(match) {
          /* Validator */
          return namedMatchValid(match[1]);
        });

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
    };
  })();

  var decorator = {
    decorate: function(chatItemView) {
       emojify.run(chatItemView.$el.find('.trpChatText')[0]);
    }
  };

  return decorator;

});
