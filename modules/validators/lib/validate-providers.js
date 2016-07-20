'use strict';

function validateProviders(providers) {
  // only github is allowed for now if were not allowing everyone
  return (providers.length === 1 && providers[0] === 'github');
}

module.exports = validateProviders;
