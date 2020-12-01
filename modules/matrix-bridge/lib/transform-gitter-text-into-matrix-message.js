'use strict';

const emojiNameMap = require('emoji-name-map');
// eslint-disable-next-line node/no-unpublished-require
const emojify = require('../../../public/repo/emojify/emojify');

function transformGitterTextIntoMatrixMessage(inputText) {
  if (typeof inputText !== 'string') {
    return inputText;
  }

  return inputText.replace(emojify.emojiNameRegex, emojiName => {
    const unicodeEmoji = emojiNameMap.get(emojiName);
    return unicodeEmoji || emojiName;
  });
}

module.exports = transformGitterTextIntoMatrixMessage;
