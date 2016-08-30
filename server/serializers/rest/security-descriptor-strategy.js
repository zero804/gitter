"use strict";


function SecurityDescriptorStrategy() {
}

SecurityDescriptorStrategy.prototype = {
  preload: function() {
    return;
  },

  map: function(sd) {
    if (!sd) return;
    if (sd.type === 'ONE_TO_ONE') return;

    return {
      type: sd.type || undefined,
      linkPath: sd.linkPath || undefined,
    };
  },

  name: 'SecurityDescriptorStrategy'
};

module.exports = SecurityDescriptorStrategy;
