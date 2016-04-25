'use strict';

var clientEnv = require('gitter-client-env');
var debug = require('debug-proxy')('app:frame-utils');

function hasParentFrameSameOrigin() {
  if (window.parent === window) return false; // This is the top window
  try {
    // This should always return true if you can access the parent origin
    return window.location.host == window.parent.location.host;
  } catch(e) {
    // Cross-origin. So No.
    return false;
  }
}

function postMessage(message) {
  try {
    var json = JSON.stringify(message);
    debug('post: %j to origin %s', json, clientEnv['basePath']);
    window.parent.postMessage(json, clientEnv['basePath']);
  } catch(e) {
    debug('Unable to post message: %j', e);
  }
}

// Tell the parent frame that weve loaded
// this is needed as node-webkit 0.11.6 loses track
// of the child iframe event listeners when the iframe.src changes (!)
// without this, the loading-view never hides on the desktop app
// https://github.com/nwjs/nw.js/issues/2867
if(hasParentFrameSameOrigin()) {
  postMessage({ type: 'childframe:loaded' });
}

module.exports = {
  hasParentFrameSameOrigin: hasParentFrameSameOrigin,
  postMessage: postMessage
};
