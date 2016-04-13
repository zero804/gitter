'use strict';

var _                               = require('underscore');
var Marionette                      = require('backbone.marionette');
var fastdom                         = require('fastdom');
var cocktail                        = require('cocktail');
var appEvents                       = require('gitter-web-appevents');
var toggleClass                     = require('utils/toggle-class');
var KeyboardEventMixin              = require('views/keyboard-events-mixin');
var PanelHeaderView                 = require('../header/header-view');
var PanelFooterView                 = require('../footer/footer-view');
var FavouriteCollectionView         = require('../favourite-collection/favourite-collection-view');
var FavouriteCollectionModel        = require('../favourite-collection/favourite-collection-model');
var PrimaryCollectionView           = require('../primary-collection/primary-collection-view');
var PrimaryCollectionModel          = require('../primary-collection/primary-collection-model');
var SecondaryCollectionView         = require('../secondary-collection/secondary-collection-view');
var SecondaryCollectionModel        = require('../secondary-collection/secondary-collection-model');
var TertiaryCollectionView          = require('../tertiary-collection/tertiary-collection-view');
var TertiaryCollectionModel         = require('../tertiary-collection/tertiary-collection-model');
var ProfileMenuView                 = require('../profile/profile-menu-view');
var FilteredFavouriteRoomCollection = require('../../../../collections/filtered-favourite-room-collection.js');
var SearchInputView                 = require('views/menu/room/search-input/search-input-view');

require('views/behaviors/isomorphic');

var PanelView = Marionette.LayoutView.extend({


  behaviors: {
    Isomorphic: {
      header:              { el: '#panel-header', init: 'initHeader' },
      profile:             { el: '#profile-menu', init: 'initProfileMenu' },
      searchInput:         { el: '#search-input', init: 'initSearchInput' },
      favouriteCollection: { el: '#favourite-collection', init: 'initFavouriteCollection' },
      primaryCollection:   { el: '#primary-collection', init: 'initPrimaryCollection' },
      secondaryCollection: { el: '#secondary-collection', init: 'initSecondaryCollection' },
      teritaryCollection:  { el: '#tertiary-collection', init: 'initTertiaryCollection' },
      footer:              { el: '#panel-footer', init: 'initFooter' },
    },
  },


  keyboardEvents: {
    'room-list.start-nav': 'startKeyboardNavigation',
    'room-list-item.prev': 'selectPrev',
    'room-list-item.next': 'selectNext'
  },

  initHeader: function(optionsForRegion) {
    return new PanelHeaderView(optionsForRegion({
      model:     this.model,
      userModel: this.model.userModel,
    }));
  },

  initProfileMenu: function(optionsForRegion) {
    return new ProfileMenuView(optionsForRegion({ model: this.model }));
  },

  initSearchInput: function(optionsForRegion) {
    return new SearchInputView(optionsForRegion({ model: this.model, bus: this.bus }));
  },

  initFavouriteCollection: function (optionsForRegion) {
    return new FavouriteCollectionView(optionsForRegion({
      collection:     this.favCollection,
      model:          this.favouriteCollectionModel,
      roomMenuModel:  this.model,
      bus:            this.bus,
      dndCtrl:        this.dndCtrl,
      roomCollection: this.model._roomCollection,
    }));

  },

  initPrimaryCollection: function(optionsForRegion) {
    return new PrimaryCollectionView(optionsForRegion({
      collection:     this.model.primaryCollection,
      model:          this.primaryCollectionModel,
      roomMenuModel:  this.model,
      bus:            this.bus,
      dndCtrl:        this.dndCtrl,
      roomCollection: this.model._roomCollection,
    }));
  },

  initSecondaryCollection: function(optionsForRegion) {
    return new SecondaryCollectionView(optionsForRegion({
      collection:        this.model.secondaryCollection,
      model:             this.secondaryCollectionModel,
      roomMenuModel:     this.model,
      bus:               this.bus,
      roomCollection:    this.model._roomCollection,
      primaryCollection: this.model.primaryCollection,
      userModel:         this.model.userModel,
      troupeModel:       this.model._troupeModel,
    }));
  },

  initTertiaryCollection: function(optionsForRegion) {
    return new TertiaryCollectionView(optionsForRegion({
      model:               this.tertiaryCollectionModel,
      collection:          this.model.tertiaryCollection,
      roomMenuModel:       this.model,
      bus:                 this.bus,
      primaryCollection:   this.model.primaryCollection,
      secondaryCollection: this.model.secondaryCollection,
      roomCollection:      this.model._roomCollection,
    }));
  },

  initFooter: function(optionsForRegion) {
    return new PanelFooterView(optionsForRegion({
      model: this.model,
      bus:   this.bus,
    }));
  },

  ui: {
    profileMenu: '#profile-menu'
  },

  modelEvents: {
    'change:panelOpenState':       'onPanelOpenStateChange',
    'primary-collection:snapshot': 'onPrimaryCollectionSnapshot',
    'change:profileMenuOpenState': 'onProfileToggle'
  },

  childEvents: {
    render: 'onChildViewRender',
  },

  initialize: function(attrs) {
    this.bus     = attrs.bus;
    this.dndCtrl = attrs.dndCtrl;

    //Sadly the favourite collection needs to be generated here rather than the room-menu-model
    //because it has a dependency on the dnd-controller JP 1/4/16
    this.favCollection = new FilteredFavouriteRoomCollection({
      roomModel:  this.model,
      collection: this.model._roomCollection,
      dndCtrl:    this.dndCtrl,
    });

    this.favouriteCollectionModel = new FavouriteCollectionModel(null, { roomMenuModel: this.model });
    this.primaryCollectionModel = new PrimaryCollectionModel(null, { roomMenuModel: this.model });
    this.secondaryCollectionModel = new SecondaryCollectionModel({}, { roomMenuModel: this.model });
    this.tertiaryCollectionModel = new TertiaryCollectionModel({}, { roomMenuModel: this.model });

    this.currentNavigableItemReference = {
      modelId: null,
      navigableItemIndex: null
    };
    this.navigableCollectionItems = [
      {
        collection: this.favCollection,
        getActive: function() {
          return this.favouriteCollectionModel.get('active');
        }
      },
      {
        collection: this.model.primaryCollection,
        getActive: function() {
          return  this.primaryCollectionModel.get('active');
        }
      },
      {
        collection: this.model.secondaryCollection,
        getActive: function() {
          return  this.secondaryCollectionModel.get('active');
        }
      },
      {
        collection: this.model.tertiaryCollection,
        getActive: function() {
          return  this.tertiaryCollectionModel.get('active');
        }
      }
    ];
    console.log(this.navigableCollectionItems);


    this.listenTo(this.bus, 'ui:swipeleft', this.onSwipeLeft, this);
    this.listenTo(this.bus, 'focus.request.chat', this.onSearchItemSelected, this);
    this.$el.find('#search-results').show();
  },

  onChildViewRender: _.debounce(function() {
    this._initNano({ iOSNativeScrolling: true, sliderMaxHeight: 200 });
  }, 50),

  _initNano: function(params) {
    fastdom.mutate(function() {
      this.$el.find('.nano').nanoScroller(params);
    }.bind(this));
  },

  onPanelOpenStateChange: function(model, val) { /*jshint unused: true */
    fastdom.mutate(function() {
      toggleClass(this.el, 'active', val);
    }.bind(this));
  },

  onSwipeLeft: function(e) {
    if (e.target === this.el) { this.model.set('panelOpenState', false); }
  },

  onSearchItemSelected: function() {
    if (!this.model.get('roomMenuIsPinned')) {
      this.model.set('panelOpenState', false);
    }
  },

  onPrimaryCollectionSnapshot: function() {
    this.el.classList.add('loading');
  },

  onChildRender: _.debounce(function (){
    this.bus.trigger('panel:render');
  }, 10),


  onProfileToggle: function(model, val) { //jshint unused: true
    this.ui.profileMenu[0].setAttribute('aria-hidden', !val);
  },

  onRender: function() {
    this.ui.profileMenu[0].setAttribute('aria-hidden', !this.profileMenuOpenState);
  },

  onDestroy: function() {
    this.stopListening(this.bus);
  },

  findNextActiveNavigableCollection: function(startingIndex, dir) {
    // We accept 1/-1 or true/false
    var dir = (dir === false) ? -1 : Math.sign(dir || 1);

    var nextCollection = (function lookAtNextCollection(index) {
      var incrementedIndex = index + dir;
      var nextIndex = incrementedIndex;
      console.log('nb', nextIndex, startingIndex, dir);
      if(dir > 0 && incrementedIndex >= this.navigableCollectionItems.length) {
        nextIndex = 0;
      }
      else if(dir < 0 && incrementedIndex < 0) {
        nextIndex = this.navigableCollectionItems.length - 1;
      }

      var potentialNextCollectionItem = this.navigableCollectionItems[nextIndex];
      console.log('na', nextIndex, startingIndex, dir);

      // Find our resultant
      var getActiveCb = (potentialNextCollectionItem.getActive || function() { return true; }).bind(this);
      if(getActiveCb()) {
        // Strap on an index for bookmarking our place later on
        return _.extend({}, potentialNextCollectionItem, {
          index: nextIndex
        });
      }
      // Our escape
      // We either only have one navigable collection
      // or we already looped around and didn't find anything
      else if(nextIndex === startingIndex) {
        return null;
      }

      // Do another iteration
      lookAtNextCollection.bind(this)(nextIndex);
    }.bind(this))(startingIndex);

    return nextCollection;
  },

  startKeyboardNavigation: function() {
    var firstNavigableCollectionItem = this.findNextActiveNavigableCollection(-1, 1);
    var firstModel = firstNavigableCollectionItem.collection.at(0);

    console.log('startKeyboardNavigation');

    this.currentNavigableItemReference = {
      modelId: firstModel.id,
      navigableItemIndex: firstNavigableCollectionItem.index
    };
    firstModel.trigger('focus:item');
  },

  progressInDirection: function(dir) {
    console.log('--------------------------------------------------------------------------------------');
    // We accept 1/-1 or true/false
    var dir = (dir === false) ? -1 : Math.sign(dir);

    console.log('panel-view progressInDirection', dir, this.currentNavigableItemReference);

    // `0` is a valid index but it's falsey :/ so we need to do this check
    var validBookmarkIndex = this.currentNavigableItemReference.navigableItemIndex === 0 || this.currentNavigableItemReference.navigableItemIndex;
    var collectionItemForActiveModel = validBookmarkIndex ?
      // Get a collection item for a bookmark (just need to move the index back according to dir and use the nice findNext method)
      this.findNextActiveNavigableCollection(this.currentNavigableItemReference.navigableItemIndex - dir, dir) :
      // Otherwise find the first active collection
      this.findNextActiveNavigableCollection(-1, dir);
    var activeModel = validBookmarkIndex && this.currentNavigableItemReference.modelId ?
      // If we had a bookmark, find it in the collection
      collectionItemForActiveModel.collection.get(this.currentNavigableItemReference.modelId) :
      // Default to the first model in the collection
      collectionItemForActiveModel.collection.models[0];

    console.log('--');


    if(activeModel) {
      // Find the index of the active model in our collection
      var activeIndex = 0;
      // We use `collection.models...` vs `collection.indexOf(model)` because the ProxyCollection doesn't update the index
      collectionItemForActiveModel.collection.models.some(function(model, index) {
        //console.log(model.id, activeModel.id)
        if(model.id === activeModel.id) {
          activeIndex = index;
          // break
          return true;
        }
      });

      // Find the next active collection
      var nextCollectionItem = this.findNextActiveNavigableCollection(collectionItemForActiveModel.index, dir);


      console.log(
        'cl',
        collectionItemForActiveModel && collectionItemForActiveModel.collection.length,
        nextCollectionItem && nextCollectionItem.collection.length
      );

      // Find the next model in the right collection
      var collectionItemWithNextModel = collectionItemForActiveModel;
      var nextInDirectionIndex = activeIndex + dir;
      console.log('lb', nextInDirectionIndex, activeIndex, collectionItemWithNextModel.collection.length);
      if(dir > 0 && nextInDirectionIndex >= collectionItemForActiveModel.collection.models.length) {
        collectionItemWithNextModel = nextCollectionItem;
        nextInDirectionIndex = 0;
      }
      else if(dir < 0 && nextInDirectionIndex < 0) {
        collectionItemWithNextModel = nextCollectionItem;
        nextInDirectionIndex = collectionItemWithNextModel.collection.models.length - 1;
      }
      console.log('la', nextInDirectionIndex, activeIndex, collectionItemWithNextModel.collection.length);

      // We use `collection.models[x]` vs `collection.at(x)` because the ProxyCollection doesn't update the index
      var nextInDirectionModel = collectionItemWithNextModel.collection.models[nextInDirectionIndex];


      // Deactivate the current item
      activeModel.trigger('blur:item');

      // Activate the next item
      if(nextInDirectionModel) {
        //console.log('next', nextInDirectionIndex, nextInDirectionModel);
        this.currentNavigableItemReference = {
          modelId: nextInDirectionModel.id,
          navigableItemIndex: collectionItemWithNextModel.index
        };
        nextInDirectionModel.trigger('focus:item');
      }
    }
  },

  selectPrev: function(e) {
    this.progressInDirection(-1);
    e.preventDefault();
    e.stopPropagation();
  },

  selectNext: function(e) {
    this.progressInDirection(1);
    e.preventDefault();
    e.stopPropagation();
  }

});


cocktail.mixin(PanelView, KeyboardEventMixin);

module.exports = PanelView;
