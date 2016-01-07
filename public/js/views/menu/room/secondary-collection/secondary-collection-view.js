'use strict';

var Marionette   = require('backbone.marionette');
var _            = require('underscore');
var template     = require('./secondary-collection-view.hbs');
var itemTemplate = require('./secondary-collection-item-view.hbs');
var RAF          = require('utils/raf');

var ItemView = Marionette.ItemView.extend({
  template: itemTemplate,
});

module.exports = Marionette.CompositeView.extend({
  childView: ItemView,
  childViewContainer: '#secondary-collection-list',
  template: template,
  className: 'secondary-collection',

  modelEvents: {
    'change:state': 'onModelChangeState'
  },

  serializeData: function(){
    var data = this.model.toJSON();
    return _.extend({}, data, {
      isSearch: (data.state === 'search')
    });
  },

  onModelChangeState: function (model, val){ /*jshint unused: true*/
    this.render();
    RAF(function(){
      this.$el.toggleClass('active', (val === 'search' || val === 'org'));
    }.bind(this));
  },

});

