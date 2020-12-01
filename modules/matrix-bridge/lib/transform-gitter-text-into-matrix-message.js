'use strict';

const emojiNameMap = require('emoji-name-map');
const emojify = require('gitter-web-shared/emojify/emojify');

function transformGitterTextIntoMatrixMessage(inputText) {
  if (typeof inputText !== 'string') {
    return inputText;
  }

  return emojify.replace(inputText, (emojiSyntax, emojiName) => {
    const unicodeEmoji = emojiNameMap.get(emojiName);
    return unicodeEmoji || emojiSyntax;
  });
}

module.exports = transformGitterTextIntoMatrixMessage;
