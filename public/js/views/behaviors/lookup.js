"use strict";
var Marionette = require('marionette');

module.exports = (function() {


  var hash = {};

  Marionette.Behaviors.behaviorsLookup = function() {
    return hash;
  };

  return {
    register: function(name, behaviour) {
      hash[name] = behaviour;
    }
  };


})();

