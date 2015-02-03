'use strict';

var $ = require('jquery');
var context = require('utils/context');
var appEvents = require('utils/appevents');
var isValidRoomUri = require('utils/valid-room-uri');

function installLinkHandler() {
  $(document).on("click", "a", function (e) {
    var target = e.currentTarget;
    var internalLink = target.hostname === context.env('baseServer');

    var location = window.location;

    // If the only difference between the current URL and the clicked URL is the hash
    // then force a window.location update so that Backbone.Router can take care of it
    if (location.scheme === target.scheme &&
        location.host === target.host &&
        location.pathname === target.pathname &&
        location.search === target.search) {
      e.preventDefault();
      window.location = target.href;
      return true;
    }

    // internal links to valid rooms shouldn't open in new windows
    if (internalLink && isValidRoomUri(target.pathname)) {
      e.preventDefault();
      var uri = target.pathname.replace(/^\//, '');
      var type = 'chat';
      if (uri === context.user().get('username')) {
        type = 'home';
      }
      appEvents.trigger('navigation', target.pathname + target.search, type, uri);
    }
  });

}

module.exports = {
  installLinkHandler: installLinkHandler
};
