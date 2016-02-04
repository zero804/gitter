'use strict';

var _                     = require('underscore');
var PrimaryCollectionView = require('../primary-collection/primary-collection-view');
var ItemView              = require('./secondary-collection-item-view.js');

var BaseCollectionView = require('../base-collection/base-collection-view');

module.exports = BaseCollectionView.extend({
  childView: ItemView,
  className: 'secondary-collection',

  childEvents: {
    'item:clicked': 'onItemClicked',
  },

  serializeData: function() {
    var data = this.model.toJSON();
    return _.extend({}, data, {
      isSearch: (data.state === 'search'),
    });
  },

  initialize: function(attrs) {
    //TODO test this JP 8/1/16
    this.primaryCollection = attrs.primaryCollection;
    this.listenTo(this.model, 'change:searchTerm', this.onSearchTermChange, this);
  },

  filter: function(model, index) {//jshint unused: true
    return (index <= 10);
  },

  onItemClicked: function(view) {
    if (this.model.get('state') === 'search') {
      return this.model.set('searchTerm', view.model.get('name'));
    }

    //TODO this seems kinda sucky, is there a better way to do this?
    //JP 8/1/16
    PrimaryCollectionView.prototype.onItemClicked.apply(this, arguments);
  },

  onSearchTermChange: function(model, val) { //jshint unused: true
    if (model.get('state') !== 'search') { return; }
    this.$el.toggleClass('active', !val);
  },

  onDestroy: function (){
    this.stopListening(this.model);
  },

});
