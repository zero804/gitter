'use strict';

var mobileLoggedInRenderer = require('../renderers/mobile-logged-in-renderer')
var mobileNotLoggedInRenderer = require('../renderers/mobile-not-logged-in-renderer')
var desktopRenderer = require('../renderers/desktop-renderer')

function selectRenderer(req) {
  if(req.isPhone) {
    if (req.user) {
      return mobileLoggedInRenderer;
    } else {
      return mobileNotLoggedInRenderer;
    }
  }

  return desktopRenderer;
}

module.exports = selectRenderer;
