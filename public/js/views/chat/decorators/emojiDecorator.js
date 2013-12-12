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

    return {

      // Main method
      run: function (el) {

        emoji.regexps.forEach(function(r) {
          findText(el, r[0], function (node, match) {
            var emojiName = r[1];
            var emojiImg = document.createElement('img');
            emojiImg.setAttribute('title', ':' + emojiName + ':');
            emojiImg.setAttribute('class', 'emoji');
            emojiImg.setAttribute('src', cdn('images/2/gitter/emoji/' + emojiName + '.png'));
            emojiImg.setAttribute('align', 'absmiddle');

            node.splitText(match.index);
            node.nextSibling.nodeValue = node.nextSibling.nodeValue.substr(match[0].length, node.nextSibling.nodeValue.length);
            emojiImg.appendChild(node.splitText(match.index));
            node.parentNode.insertBefore(emojiImg, node.nextSibling);
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
