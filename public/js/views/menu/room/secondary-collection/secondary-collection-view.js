'use strict';

var Marionette   = require('backbone.marionette');
var _            = require('underscore');
var template     = require('./secondary-collection-view.hbs');
var itemTemplate = require('../primary-collection/primary-collection-view');
var RAF          = require('utils/raf');

var ItemView = Marionette.ItemView.extend({
  tagName: 'li',
  template: itemTemplate
});

module.exports = Marionette.CompositeView.extend({
  itemView: ItemView,
  childViewContainer: '#secondary-collection-list',
  template: template,

  modelEvents: {
    'change:secondaryCollectionActive': 'onActiveStateChange',
    'change:secondaryCollectionHeader': 'render'
  },

  serializeData: function(){
    var data = this.model.toJSON();
    return _.extend({}, data, {
      isSearch: (data.state === 'search')
    });
  },

  onActiveStateChange: function (model, val){ /*jshint unused: true*/
    this.render();
    RAF(function(){
      this.$el.toggleClass('active', !!val);
    }.bind(this));
  },

});
