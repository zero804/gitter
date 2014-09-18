define([
  'marionette'
], function(Marionette) {
  "use strict";

  var hash = {};

  Marionette.Behaviors.behaviorsLookup = function() {
    return hash;
  };

  return {
    register: function(name, behaviour) {
      hash[name] = behaviour;
    }
  };

});
