define(['underscore'], function(_) {
  "use strict";

  function LegacyMutations(callback) {
    this.callback = callback;
    this.onModifications = _.debounce(_.bind(function() {
        this.callback([]);
      }, this), 5);
  }

  LegacyMutations.prototype = {
    observe: function(target) {
      this._target = target;
      // NB this is not a fullblow shim, just enough to get by
      // therefore options are ignored
      target.addEventListener('DOMSubtreeModified', this.onModifications, false);
    },

    disconnect: function() {
      if(!this._target) return;
      this._target.removeEventListener('DOMSubtreeModified', this.onModifications, false);
      delete this._target;
    },

    takeRecords: function() {
      var target = this._target;

      target.removeEventListener('DOMSubtreeModified', this.onModifications, false);
      target.addEventListener('DOMSubtreeModified', this.onModifications, false);
    }
  };

  return LegacyMutations;

});
