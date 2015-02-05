'use strict';

module.exports = {
  hasParentFrameSameOrigin: function() {
    if (window.parent === window) return false; // This is the top window
    try {
      // This should always return true if you can access the parent origin
      return window.location.origin == window.parent.location.origin;
    } catch(e) {
      // Cross-origin. So No.
      return false;
    }
  },

  postMessage: function(message) {
    window.parent.postMessage(JSON.stringify(message), window.location.origin);
  }
};
