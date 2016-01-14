'use strict';

var _                   = require('underscore');
var Backbone            = require('backbone');
var Marionette          = require('backbone.marionette');
var RAF                 = require('utils/raf');
var ItemView            = require('./primary-collection-item-view');
var context             = require('utils/context');
var cocktail            = require('cocktail');
var KeyboardEventsMixin = require('../../../keyboard-events-mixin.js');

var PrimaryCollectionView = Marionette.CollectionView.extend({

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

  keyboardEvents: {
    'room.up': 'onKeyboardUpPressed',
    'room.down': 'onKeyboardDownPressed',
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
    if (this.dndCtrl) {
      this.dndCtrl.pushContainer(this.el);
      this.listenTo(this.dndCtrl, 'room-menu:add-favourite', this.onFavouriteAdded, this);
      this.listenTo(this.dndCtrl, 'room-menu:sort-favourite', this.onFavouritesSorted, this);
    }

    this.listenTo(this.bus, 'room-menu:keyboard:focus', this.onKeyboardFocus, this);
    this.listenTo(this.model, 'change:state', this.onModelStateChange, this);
    this.listenTo(this.model, 'change:selectedOrgName', this.onModelStateChange, this);
    this.listenTo(context.troupe(), 'change:id', this.updateSelectedModel, this);

    this.updateSelectedModel();
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
  sortFavourites: function(a, b) {
    if (!a.get('favourite')) return -1;
    if (!b.get('favourite')) return 1;
    return (a.get('favourite') < b.get('favourite')) ? -1 : 1;
  },

  onModelStateChange: function(model, val) { /*jshint unused: true*/

    if (model.get('state') === 'favourite') {
      //This feels gross
      this.collection.comparator = this.sortFavourites;

      //a sort will trigger a render so we can skip out on the render part
      this.collection.sort();
    } else {
      this.collection.comparator = null;
      this.render();
    }

    RAF(function() {
      this.$el.toggleClass('active', (val !== 'search'));
    }.bind(this));
  },

  onItemClicked: function(view) {
    var viewModel = view.model;
    var name = viewModel.get('uri');
    var url = '/' + name;

    //If the room menu is pinned dont try to close the pannel
    if (!this.model.get('roomMenuIsPinned')) {
      this.model.set('panelOpenState', false);
    }

    setTimeout(function() {
      this.bus.trigger('navigation', url, 'chat', name);
    }.bind(this), 250);
  },

  //TODO The filter should be resued within the view filter method?
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

  updateSelectedModel: function() {
    var selectedModel      = this.collection.findWhere({ selected: true });
    var newlySelectedModel = this.collection.findWhere({ id: context.troupe().get('id') });

    if (selectedModel) selectedModel.set('selected', false);
    if (newlySelectedModel) newlySelectedModel.set('selected', true);
  },

  onKeyboardFocus: function() {
    if (!this.collection.findWhere({ focus: true })) {
      this.collection.at(0).set('focus', true);
    }

    this.uiModel.set('isFocused', true);
  },

  onKeyboardUpPressed: function() {
    this._onKeyboardMovement(-1);
  },

  onKeyboardDownPressed: function() {
    this._onKeyboardMovement(1);
  },

  _onKeyboardMovement: function(indexMod) {
    var currentlyFocusedModel = this.collection.findWhere({ focus: true });
    var index = this.collection.indexOf(currentlyFocusedModel) + indexMod;

    //cycle if we need to
    if (index >= this.collection.length) { index = 0 }

    var newlyFocusedModel = this.collection.at(index);

    if (currentlyFocusedModel) currentlyFocusedModel.set('focus', false);
    if (newlyFocusedModel) newlyFocusedModel.set('focus', true);

    //Scrolling Logic
    var scrollOffset = index - 10;
    var scrollType = 'offset';

    //TODO TEST
    if (scrollOffset < 0) { scrollOffset = 0 }
    if (index >= this.collection.length) { scrollOffset = index }
    if(scrollOffset <= 10) scrollType = 'top';

    this.bus.trigger('room-menu:keyboard:select-last', newlyFocusedModel.get('id'), scrollOffset);

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

cocktail.mixin(PrimaryCollectionView, KeyboardEventsMixin);

module.exports = PrimaryCollectionView;
