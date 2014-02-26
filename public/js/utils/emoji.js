/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
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
