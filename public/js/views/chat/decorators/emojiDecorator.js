/* jshint unused:true, browser:true,  strict:true */
/* global define:false */
define(['utils/emoji', 'utils/cdn'], function(emoji, cdn) {

  "use strict";

  var emojify = (function () {

    // Helper function to find text within DOM
    var findText = function (element, pattern, callback) {
      for (var childi = element.childNodes.length; childi-- > 0;) {
        var child = element.childNodes[childi];
        if (child.nodeType == 1) {

          // Get tag name and class attribute
          var tag = child.tagName.toLowerCase(),
            classname;
          if (child.hasAttribute('class')) classname = child.getAttribute('class').toLowerCase();

          // Hacky at the minute, needs to be fixed
          if (classname) {
            if (tag !== 'script' && tag !== 'style' && tag !== 'textarea' && classname !== 'no-emojify') findText(child, pattern, callback);
          } else {
            if (tag !== 'script' && tag !== 'style' && tag !== 'textarea') findText(child, pattern, callback);
          }

        } else if (child.nodeType == 3) {
          var matches = [];
          if (typeof pattern === 'string') {
          } else {
            var match;
            while (match = pattern.exec(child.data)) {
                  matches.push(match);
            }
          }
          for (var i = matches.length; i-- > 0;)
          callback.call(window, child, matches[i]);
        }
      }
    };

    function isWhitespace(s) {
      return s === ' ' || s === '\t' || s === '\r' || s === '\n' || s === '';
    }

    function smileyValid(match) {
      var m = match[0];

      /* Any smiley thats 3 chars long is probably a smiley */
      if(m.length > 2) return true;

      var index = match.index;
      var input = match.input;

      /* At the beginning? */
      if(index === 0) return true;

      /* At the end? */
      if(input.length === m.length + index) return true;

      /* Has a whitespace before? */
      if(isWhitespace(input.charAt(index - 1))) return true;

      /* Has a whitespace before? */
      if(isWhitespace(input.charAt(m.length + index))) return true;

      return false;
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

    return {

      // Main method
      run: function (el) {
        // Search for named emoji
        findText(el, namedEmojiRegExp, function (node, match) {
          if(!namedMatchValid(match[1])) {
            /* Don't match */
            return match[0];
          }

          insertEmojicon(node, match, match[1]);
        });

        // Search for emoticons
        emoji.emoticons.forEach(function(r) {
          findText(el, r[0], function (node, match) {
            if(!smileyValid(match)) {
              /* Don't match */
              return match[0];
            }

            insertEmojicon(node, match, r[1]);
          });
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
