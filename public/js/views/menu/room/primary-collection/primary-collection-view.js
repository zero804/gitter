'use strict';

var Backbone           = require('backbone');
var ItemView           = require('./primary-collection-item-view');
var BaseCollectionView = require('../base-collection/base-collection-view');

var PrimaryCollectionView = BaseCollectionView.extend({

  childView: ItemView,
  className: 'primary-collection',
  ui: {
    collection: '.js-collection-list'
  },

  initialize: function(options) {

    if (!options || !options.bus) {
      throw new Error('A valid event bus must be passed to a new PrimaryCollectionView');
    }

    this.bus     = options.bus;
    this.model   = options.model;
    this.dndCtrl = options.dndCtrl;
    this.uiModel = new Backbone.Model({ isFocused: false });

    //TODO turn this into an error if there is a dndCtrl
    this.listenTo(this.dndCtrl, 'room-menu:add-favourite', this.onFavouriteAdded, this);
    this.listenTo(this.dndCtrl, 'room-menu:sort-favourite', this.onFavouritesSorted, this);
  },

  filter: function (model, index){ //jshint unused: true
    return (this.model.get('search') === 'search') ? (index <= 5) : true;
  },

  //TODO The filter should be reused within the view filter method?
  onFavouriteAdded: function(id) {
    var newFavModel = this.collection.get(id);
    var favIndex    = this.collection
      .filter(function(model) { return !!model.get('favourite') }).length;
    newFavModel.set('favourite', (favIndex + 2));
    newFavModel.save();
  },

  //TODO TEST THIS - Need to test it a lot
  //this logic is a bit crazy :(
  onFavouritesSorted: function(id) {
    var elements = this.$el.find('[data-room-id]');
    Array.prototype.slice.apply(elements).forEach(function(el, index) {
      //This can't be the right way to do this
      if (el.dataset.roomId !== id) return;
      var model = this.collection.get(el.dataset.roomId);
      model.set('favourite', (index + 1));
      model.save();
    }.bind(this));
  },

  //Before we render we remove the collection container from the drag & drop instance
  onBeforeRender: function (){
    this.dndCtrl.removeContainer(this.ui.collection[0]);
  },

  //Once we have rendered we re-add the container to dnd
  onRender: function (){
    this.dndCtrl.pushContainer(this.ui.collection[0]);
    BaseCollectionView.prototype.onRender.apply(this, arguments);
  },

  onDestroy: function (){
    this.stopListening(this.bus);
    this.stopListening(this.model);
    this.stopListening(this.dndCtrl);
    this.stopListening(this.collection);
  },

});


module.exports = PrimaryCollectionView;
