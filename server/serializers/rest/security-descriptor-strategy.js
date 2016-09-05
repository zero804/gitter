"use strict";

function SimpleSecurityDescriptorStrategy() {
}

SimpleSecurityDescriptorStrategy.prototype = {
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

  mapFull: function(sd) {
    if (!sd) return;
    if (sd.type === 'ONE_TO_ONE') return;

    return {
      type: sd.type || undefined,
      linkPath: sd.linkPath || undefined,
      admins: sd.admins || undefined,
      members: sd.members || undefined
    };
  },

  name: 'SimpleSecurityDescriptorStrategy'
};

function FullSecurityDescriptorStrategy() {
}

FullSecurityDescriptorStrategy.prototype = {
  preload: function() {
    return;
  },

  map: function(sd) {
    if (!sd) return;
    if (sd.type === 'ONE_TO_ONE') return;

    return {
      type: sd.type || undefined,
      linkPath: sd.linkPath || undefined,
      admins: sd.admins || undefined,
      members: sd.members || undefined
    };
  },

  name: 'FullSecurityDescriptorStrategy'
};


function simple() {
  return new SimpleSecurityDescriptorStrategy();
}

function full() {
  return new FullSecurityDescriptorStrategy();
}

module.exports = {
  full: full,
  simple: simple
};
