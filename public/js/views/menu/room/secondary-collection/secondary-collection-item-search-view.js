'use strict';

var _                           = require('underscore');
var searchTemplate              = require('./secondary-collection-item-search-view.hbs');
var SecondaryCollectionItemView = require('./secondary-collection-item-view');

module.exports = SecondaryCollectionItemView.extend({
  className: 'room-item--search-message',
  triggers: {
    'click #user-link': 'user:item:clicked',
    'click':            'item:clicked',
  },
  template: searchTemplate,
  serializeData: function() {
    var data = this.model.toJSON();
    return (!!data && data.fromUser) ?
      _.extend({}, SecondaryCollectionItemView.prototype.serializeData.apply(this, arguments), {
        userUrl:         data.fromUser.url,
        userDisplayName: data.fromUser.displayName,
      }) :
      data;
  },
});
