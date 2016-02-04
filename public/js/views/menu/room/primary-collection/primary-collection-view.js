'use strict';

var Backbone           = require('backbone');
var RAF                = require('utils/raf');
var ItemView           = require('./primary-collection-item-view');
var BaseCollectionView = require('../base-collection/base-collection-view');

var PrimaryCollectionView = BaseCollectionView.extend({

  childView: ItemView,
  className: 'primary-collection',

  initialize: function(options) {

    if (!options || !options.bus) {
      throw new Error('A valid event bus must be passed to a new PrimaryCollectionView');
    }

    this.bus     = options.bus;
    this.model   = options.model;
    this.dndCtrl = options.dndCtrl;
    this.uiModel = new Backbone.Model({ isFocused: false });

    //TODO turn this into an error if there is a dndCtrl
    if (this.dndCtrl) {
      this.dndCtrl.pushContainer(this.el);
      this.listenTo(this.dndCtrl, 'room-menu:add-favourite', this.onFavouriteAdded, this);
      this.listenTo(this.dndCtrl, 'room-menu:sort-favourite', this.onFavouritesSorted, this);
    }
  },

  filter: function (model, index){ //jshint unused: true
    return (this.model.get('search') === 'search') ? (index <= 5) : true;
  },

  onModelStateChange: function(model, val) { /*jshint unused: true*/
    RAF(function() {
      this.$el.toggleClass('active', (val !== 'search'));
    }.bind(this));
  },

  onItemClicked: function(view) {
    var viewModel = view.model;

    //TODO This could be alot more DRY JP 27/1/16
    var name = (viewModel.get('uri') || viewModel.get('url'));
    var url  = (name[0] !== '/') ?  '/' + name : name;

    //If the room menu is pinned dont try to close the pannel
    if (!this.model.get('roomMenuIsPinned')) {
      this.model.set('panelOpenState', false);
    }

    //reset any models that have keyboard focus
    //TODO ABSTRACT THIS TO KEYBOARD CTRL
    var focusedModels = this.collection.where({ focus: true });
    focusedModels.forEach(function(model) { model.set('focus', false)});

    //TODO The timeout is only needed if the room menu is not pinned
    setTimeout(function() {
      this.bus.trigger('navigation', url, 'chat', name);
    }.bind(this), 250);
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

  onDestroy: function (){
    this.stopListening(this.bus);
    this.stopListening(this.model);
    this.stopListening(this.dndCtrl);
    this.stopListening(this.collection);
  },

});


module.exports = PrimaryCollectionView;
