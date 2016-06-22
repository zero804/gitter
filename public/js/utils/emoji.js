"use strict";
var emojify = require('emojify');
var cdn = require('gitter-web-cdn');

module.exports = (function() {


  emojify.setConfig({
    img_dir: cdn('images/emoji')
  });

  return {
    emojify: emojify,
    named: emojify.emojiNames
  };


})();
