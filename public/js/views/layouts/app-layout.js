"use strict";
var Marionette = require('backbone.marionette');
var modalRegion = require('components/modal-region');

require('views/behaviors/isomorphic');

module.exports = (function () {

  /** @const */
  var BACKSPACE = 8;

  var AppIntegratedLayout = Marionette.LayoutView.extend({
    template: false,
    el: 'body',

    behaviors: {
      Isomorphic: {
      }
    },

    events: {
      "keydown": "onKeyDown"
    },

    initialize: function () {
      this.dialogRegion = modalRegion;
    },

    onKeyDown: function(e) {
      if(e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.keyCode === BACKSPACE) {
        e.stopPropagation();
        e.preventDefault();
      }
    }

  });

  return AppIntegratedLayout;

})();
