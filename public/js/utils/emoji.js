'use strict';
var emojify = require('emojify'); // eslint-disable-line node/no-missing-require
var cdn = require('gitter-web-cdn');

module.exports = (function() {
  emojify.setConfig({
    img_dir: cdn('images/emoji'),
    ignore_emoticons: true
  });

  return {
    emojify: emojify,
    named: emojify.emojiNames
  };
})();
