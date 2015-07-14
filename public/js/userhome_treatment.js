"use strict";

require('utils/frame-utils');

var linkEl = document.getElementById('userhome-oauth-link');

if (linkEl) {
  // override the oauth link so that we refresh to show the new private rooms
  linkEl.addEventListener('click', function(e) {
    var target = e.target.href;

    window.addEventListener('message', function(event) {
      if(event.data === 'oauth_upgrade_complete') {
        window.location.reload(true);
      }
    });

    window.open(target);
    e.preventDefault();

  });
}