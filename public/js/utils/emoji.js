define(['emojify','utils/cdn'], function(emojify, cdn) {
  "use strict";

  emojify.setConfig({
    img_dir: cdn('images/2/gitter/emoji/')
  });

  return {
    emojify: emojify,
    named: emojify.emojiNames
  };

});
