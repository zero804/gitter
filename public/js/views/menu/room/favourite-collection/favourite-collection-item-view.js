'use strict';

var _                         = require('underscore');
var PrimaryCollectionItemView = require('../primary-collection/primary-collection-item-view');

module.exports = PrimaryCollectionItemView.extend({

  attributes: function() {
    //JP 1/4/16
    //If the item was not previously in the favourite collection before drag start it could have
    //just been added by a user dragging, as such we want to mark it as a temporary item
    var className = this.model.get('isTempItem') ? 'room-item--favourite temp' : 'room-item--favourite';
    return _.extend({}, PrimaryCollectionItemView.prototype.attributes.apply(this, arguments), {
      class: className
    });
  }
});
