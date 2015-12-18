'use strict';

var _          = require('underscore');
var Marionette = require('backbone.marionette');
var RAF        = require('utils/raf');
var ItemView   = require('./primary-collection-item-view');

module.exports = Marionette.CollectionView.extend({
  childEvents: {
    'item:clicked': 'onItemClicked',
  },
  childView: ItemView,

  buildChildView: function(model, ItemView, attrs) {
    var index = this.collection.indexOf(model);
    return new ItemView(_.extend({}, attrs, {
      model: model,
      index: index,
    }));
  },

  initialize: function(options) {

    if (!options || !options.bus) {
      throw new Error('A valid event bus must be passed to a new PrimaryCollectionView');
    }

    this.bus     = options.bus;
    this.model   = options.model;
    this.dndCtrl = options.dndCtrl;

    //TODO turn this inot an error
    if (this.dndCtrl){
      this.dndCtrl.pushContainer(this.el);
      this.listenTo(this.dndCtrl, 'room-menu:add-favourite', this.onFavouriteAdded, this);
    }

    this.listenTo(this.model, 'change:state', this.onModelStateChange, this);
    this.listenTo(this.model, 'change:selectedOrgName', this.onModelStateChange, this);
  },

  filter: function(model) {
    var state   = this.model.get('state');
    var orgName = this.model.get('selectedOrgName');

    if (state === 'org' && orgName === '') {
      throw new Error('Room Menu Model is in the org state with no selectedOrgName');
    }

    switch (state) {

      case 'org':
        var name = model.get('name').split('/')[0];
        return (name === orgName) && !!model.get('roomMember');

      case 'favourite':
        return !!model.get('favourite');

      case 'people':
        return model.get('githubType') === 'ONETOONE';

      //should no show no results when in the search state
      case 'search':
        return false;

      //show all models in the deffault state
      default:
        return true;
    }
  },

  //WHERE SHOULD THIS GO? IT ALSO NEEDS TO BE TESTED
  sortFavourites: function (a, b){
    if(!a.get('favourite')) return -1;
    if(!b.get('favourite')) return 1;
    return (a.get('favourite') < b.get('favourite')) ? -1 : 1;
  },

  onModelStateChange: function(model, val) { /*jshint unused: true*/

    if(model.get('state') === 'favourite') {
      //This feels gross
      this.collection.comparator = this.sortFavourites;
      this.collection.sort();
    }
    else {
      this.collection.comparator = null;
      this.render();
    }

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

  //TODO The filter should be resued within the view filter method?
  onFavouriteAdded: function (id){
    var newFavModel = this.collection.get(id);
    var favIndex = this.collection
      .filter(function(model){ return !!model.get('favourite') }).length;
    newFavModel.set('favourite', (favIndex + 2));
    newFavModel.save();
  },

  render: function() {
    this.$el.removeClass('loaded');
    RAF(function() {
      Marionette.CollectionView.prototype.render.apply(this, arguments);
      RAF(function() {
        this.$el.addClass('loaded');
      }.bind(this));
    }.bind(this));
  },

});
