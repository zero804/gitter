"use strict";

function TroupeBackendStrategy() {
}

TroupeBackendStrategy.prototype = {

  preload: function() {
    return;
  },

  map: function(troupe) {
    var sd = troupe.sd;
    if (troupe.oneToOne) return undefined;
    if (!sd) return undefined;
    return {
      type: sd.type || undefined,
      linkPath: sd.linkPath || undefined,
    };
  },

  name: 'TroupeBackendStrategy'
};

module.exports = TroupeBackendStrategy;
