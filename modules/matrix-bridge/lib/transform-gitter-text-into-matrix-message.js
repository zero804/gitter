'use strict';

const emojiNameMap = require('emoji-name-map');
const emojify = require('gitter-web-shared/emojify/emojify');

function transformGitterTextIntoMatrixMessage(inputText, serializedGitterMessage) {
  if (typeof inputText !== 'string') {
    return inputText;
  }

  let resultantText = inputText;

  if (serializedGitterMessage.status) {
    // Strip the leading user mention from the status mention because Matrix adds it for us
    resultantText = resultantText.replace(/^(@.*?\s)|(.*?<\/span>\s)/, '');
  }

  resultantText = emojify.replace(resultantText, (emojiSyntax, emojiName) => {
    const unicodeEmoji = emojiNameMap.get(emojiName);
    return unicodeEmoji || emojiSyntax;
  });

  return resultantText;
}

module.exports = transformGitterTextIntoMatrixMessage;
