'use strict';

var _             = require('underscore');
var Marionette    = require('backbone.marionette');
var itemTemplate  = require('./primary-collection-view.hbs');
var getRoomAvatar = require('utils/get-room-avatar');
var RAF           = require('utils/raf');

var ItemView = Marionette.ItemView.extend({
  className: 'room-item',
  template: itemTemplate,
  triggers: {
    'click': 'item:clicked',
  },
  serializeData: function() {
    var data = this.model.toJSON();
    return _.extend({}, data, {
      roomAvatarUrl:  getRoomAvatar(data.name),
    });
  },
});

module.exports = Marionette.CollectionView.extend({
  childEvents: {
    'item:clicked': 'onItemClicked',
  },
  childView: ItemView,
  initialize: function(options) {

    if (!options || !options.bus) {
      throw new Error('A valid event bus must be passed to a new PrimaryCollectionView');
    }

    this.bus = options.bus;
    this.model = options.model;
    this.listenTo(this.model, 'change:state', this.onModelStateChange, this);
    this.listenTo(this.model, 'change:selectedOrgName', this.onModelStateChange, this);
  },

  filter: function(model) {
    var orgName = this.model.get('selectedOrgName');

    switch (this.model.get('state')) {

      case 'org':
        var name = model.get('name').split('/')[0];
        return (name === orgName) && !!model.get('roomMember');

      case 'favourite':
        return !!model.get('favourite');

      case 'people':
        return model.get('githubType') === 'ONETOONE';

      case 'search':

        //TODO remove as collection members should be search results
        return false;

      default:
        return true;
    }
  },

  onModelStateChange: function(model, val) { /*jshint unused: true*/
    this.render();
    RAF(function() {
      this.$el.toggleClass('active', (val !== 'search'));
    }.bind(this));
  },

  onItemClicked: function(view) {
    var viewModel = view.model;
    var name = viewModel.get('name');
    var url = '/' + name;

    //If thr room menu is pinned dont try to close the pannel
    if (!this.model.get('roomMenuIsPinned')) {
      this.model.set('panelOpenState', false);
    }

    setTimeout(function() {
      this.bus.trigger('navigation', url, 'chat', name);
    }.bind(this), 250);
  },

});
