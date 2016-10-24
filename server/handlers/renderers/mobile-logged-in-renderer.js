'use strict';

var renderChat = require('./chat-internal');
var orgRenderer = require('./org');

function renderPrimaryView(req, res, next, options) {
  var uriContext = options.uriContext;
  var troupe = uriContext.troupe;
  var group = uriContext.group;

  if (troupe) {
    // Rendering a chat room?
    return renderChat(req, res, next, {
      uriContext: uriContext,
      template: 'mobile/mobile-chat',
      script: 'mobile-chat',
      isMobile: true
    });
  }

  if (group) {
    // Rendering a group home?
    return orgRenderer.renderOrgPage(req, res, next);
  }

  return next('route');
}

function hasSecondaryView() {
  // Mobile does not use a secondary view
  return false;
}

module.exports = {
  renderPrimaryView: renderPrimaryView,
  hasSecondaryView: hasSecondaryView
}
