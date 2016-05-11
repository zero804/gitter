'use strict';

var _ = require('underscore');

// Extend a Marrionette view option hash without clobbering the super entry
// Useful for `events`, `modelEvents`, `childEvents` etc when extending another view
var extendCallbackHash = function(oldHash, newHash) {
  var resultantHash = _.extend({}, oldHash, newHash);

  Object.keys(oldHash).forEach(function(key) {
    resultantHash[key] = function() {
      var oldCb = oldHash[key];
      var newCb = newHash[key];
      // Coerce string into function
      oldCb = (typeof oldCb === 'string') ? this[oldCb] : oldCb;
      newCb = (typeof newCb === 'string') ? this[newCb] : newCb;

      if(oldCb) {
        oldCb.apply(this, arguments);
      }
      if(newCb) {
        newCb.apply(this, arguments);
      }
    };
  });

  return resultantHash;
};

module.exports = extendCallbackHash;
