define([
  'marionette',
  'utils/highlight',
  './lookup'
], function(Marionette, highlight, behaviourLookup) {
  "use strict";

  var Behavior = Marionette.Behavior.extend({

    modelEvents: {
      "change:highlights": "onRender"
    },

    onRender: function() {
      if (!this.view.model) return;
      var highlights = this.view.model.get('highlights');

      if (this.highlighted) {
        highlight.removeHighlights(this.view.el);
      }

      if (!highlights || !highlights.length) return;

      this.highlighted = true;
      highlight.highlight(this.view.el, highlights);
    }
  });

  behaviourLookup.register('Highlight', Behavior);
  return Behavior;

});
