'use strict';

var Backbone = require('backbone');

var KeyboardControllerModel = Backbone.Model.extend({
  defaults: {
    mapKey: null,
    listIndex: null,
    modelId: null,
    modelIndex: null
  },

  initialize: function() {

  }
});

module.exports = KeyboardControllerModel;
