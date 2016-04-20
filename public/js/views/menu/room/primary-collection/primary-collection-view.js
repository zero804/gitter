'use strict';

var Backbone                    = require('backbone');
var Marionette                  = require('backbone.marionette');
var _                           = require('underscore');
var ItemView                    = require('./primary-collection-item-view');
var BaseCollectionView          = require('../base-collection/base-collection-view');
var EmptyAllView                = require('./primary-collection-item-all-empty-view.js');
var EmptySearchView             = require('./primary-collection-item-search-empty-view.js');
var EmptyFavouriteView          = require('./primary-collection-item-favourite-empty-view.js');
var perfTiming                  = require('components/perf-timing');
var compositeViewRenderTemplate = require('utils/composite-view-render-template');
var domIndexById                = require('../../../../utils/dom-index-by-id');
var toggleClass                 = require('utils/toggle-class');

var proto = BaseCollectionView.prototype;

var PrimaryCollectionView = BaseCollectionView.extend({

  //Ugh, Marionette, get your game together JP 17/2/16
  _renderTemplate: compositeViewRenderTemplate,
  childView: ItemView,
  className: 'primary-collection',

  ui: {
    collection:   '#collection-list',
    searchHeader: '#primary-collection-search-header'
  },

  reorderOnSort: true,
  hasInit: false,
  getEmptyView: function() {
    switch (this.roomMenuModel.get('state')) {
      case 'all':
        return EmptyAllView;
      case 'search':
        return EmptySearchView;
      case 'favourite':
        return EmptyFavouriteView;
      default:
        return Marionette.ItemView.extend({ template: false });
    }
  },

  childViewOptions: function(model) {
    var baseOptions   = BaseCollectionView.prototype.childViewOptions.apply(this, arguments);
    baseOptions.model = model;
    var id            = model.get('id');
    var element       = this.domMap[id];
    return !!element ? _.extend(baseOptions, { el: element }) : baseOptions;
  },

  initialize: function(options) {
    if (!options || !options.bus) {
      throw new Error('A valid event bus must be passed to a new PrimaryCollectionView');
    }

    this.bus     = options.bus;
    this.model   = options.model;
    this.dndCtrl = options.dndCtrl;
    this.uiModel = new Backbone.Model({ isFocused: false, isDragging: false });
    this.listenTo(this.roomMenuModel, 'change:searchTerm', this.setActive, this);
    this.listenTo(this.collection, 'filter-complete', this.setActive, this);
    this.listenTo(this.dndCtrl, 'dnd:start-drag', this.onDragStart, this);
    this.listenTo(this.dndCtrl, 'dnd:end-drag', this.onDragEnd, this);
    this.listenTo(this.uiModel, 'change:isDragging', this.onDragStateUpdate, this);
    BaseCollectionView.prototype.initialize.apply(this, arguments);
  },

  setActive: function() {
    switch (this.roomMenuModel.get('state')){
      case 'search':
        if (!!this.roomMenuModel.get('searchTerm')) {
          this.el.classList.add('active');
          this.ui.searchHeader[0].classList.remove('hidden');
        }

        //
        else {
          this.el.classList.remove('active');
          this.ui.searchHeader[0].classList.add('hidden');
        }

        break;
      default:
        this.ui.searchHeader[0].classList.add('hidden');

        if (!this.collection.length) {
          return this.el.classList.remove('active');
        }

        proto.setActive.apply(this, arguments);
        break;

    }
  },

  filter: function(model, index) { //jshint unused: true
    switch (this.roomMenuModel.get('state')) {
      case 'search':
        return (index <= 5);
      default:
        return true;
    }
  },

  onDragStart: function () {
    this.uiModel.set('isDragging', true);
    this.el.classList.add('dragging');
  },

  onDragEnd: function () {
    this.uiModel.set('isDragging', false);
    this.el.classList.remove('dragging');
  },

  onDragStateUpdate: function (model, val) { //jshint unused: true
    toggleClass(this.el, 'dragging', val);
  },

  getChildContainerToBeIndexed: function () {
    //use the second child because the first child is the hidden search header
    return this.el.children[1];
  },

  //Before we render we remove the collection container from the drag & drop instance
  onBeforeRender: function() {
    this.domMap = domIndexById(this.getChildContainerToBeIndexed());
    this.dndCtrl.removeContainer(this.ui.collection[0]);
  },

  //Once we have rendered we re-add the container to dnd
  onRender: function() {
    if (!this.hasInit && this.collection.length > 0) {
      this.hasInit = true;
      perfTiming.end('left-menu-init');
    }

    this.dndCtrl.pushContainer(this.ui.collection[0]);
    BaseCollectionView.prototype.onRender.apply(this, arguments);
  },

  onDestroy: function() {
    this.stopListening(this.bus);
    this.stopListening(this.model);
    this.stopListening(this.dndCtrl);
    this.stopListening(this.collection);
  },

});

module.exports = PrimaryCollectionView;
