'use strict';

var Marionette        = require('backbone.marionette');
var _                 = require('underscore');
var itemTemplate      = require('./secondary-collection-item-view.hbs');
var roomNameShortener = require('../../../../utils/room-menu-name-shortener');
var getRoomAvatar     = require('utils/get-room-avatar');

module.exports = Marionette.ItemView.extend({
  template: itemTemplate,
  className: 'room-item',

  //TODO this is used in primary-collection-item-view
  //centralize it JP 22/1/16
  attributes: function() {
    var delay = (0.003125 * this.index);
    return {
      'style': 'transition-delay: ' + delay + 's',
    };
  },

  triggers: {
    'click': 'item:clicked',
  },

  constructor: function(attrs) {
    this.index = attrs.index;
    Marionette.ItemView.prototype.constructor.apply(this, arguments);
  },

  serializeData: function() {
    var data = this.model.toJSON();
    //console.log('-----------------------');
    //console.log(data);
    //console.log('-----------------------');

    //When recent searches are rendered the models have an avatarUrl of null,
    //this is because we want to hide the avatar image ONLY in this case
    //as such we have this check here jp 25/1/16
    if(data.avatarUrl !== null){
      data.avatarUrl = (data.avatarUrl || getRoomAvatar(data.name || data.uri || ' '));
    }

    return _.extend({}, data, {
      name: roomNameShortener((data.name || data.uri)),
    });
  }

});


