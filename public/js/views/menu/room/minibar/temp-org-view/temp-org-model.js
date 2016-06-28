"use strict";

var ItemModel = require('../minibar-item-model');
var _super = ItemModel.prototype;

module.exports = ItemModel.extend({
  defaults: { type: 'org' },
  initialize: function(attrs, options) {
    this.troupe = options.troupe;
    _super.initialize.apply(this, arguments);
  },
});
