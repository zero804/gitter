'use strict';

var Backbone = require('backbone');
var _ = require('underscore');
var itemTemplate = require('./primary-collection-item-view.hbs');
var apiClient = require('../../../../components/api-client');
var context = require('../../../../utils/context');
var appEvents = require('../../../../utils/appevents');
var parseForTemplate = require('gitter-web-shared/parse/left-menu-primary-item');
var toggleClass = require('../../../../utils/toggle-class');

var BaseCollectionItemView = require('../base-collection/base-collection-item-view');

module.exports = BaseCollectionItemView.extend({

  template: itemTemplate,

  modelEvents: _.extend({}, BaseCollectionItemView.prototype.modelEvents, {
    'change:favourite': 'onFavouriteChange',
  }),

  ui: _.extend({}, BaseCollectionItemView.prototype.ui, {
    favouriteButton: '.js-room-favourite-button',
    favouriteButtonIcon: '.js-room-favourite-button-icon'
  }),

  events: {
    'click #room-item-options-toggle': 'onOptionsClicked',
    'click #room-item-hide':           'onHideClicked',
    'click #room-item-leave':          'onLeaveClicked',
    'click @ui.favouriteButton':       'onFavouriteClicked',
    mouseleave:                        'onMouseOut',

    // Note this probably won't get triggered because we listen to clicks on
    // the wrapper but better safe than sorry
    click: 'onClick'
  },

  className: null,
  attributes: function() {
    var id = this.model.get('id');
    var type = this.model.get('type');

    var className = 'room-item';
    if(this.model.get('githubType') === 'ONETOONE') {
      className = 'room-item--one2one';
    }
    else if(type === 'org') {
      className = 'room-item--group';
    }

    return {
      id: id,
      class: className,
      'data-id': id,
      'data-type': type === 'org' ? 'room-list-group' : 'room'
    };
  },

  initialize: function() {
    BaseCollectionItemView.prototype.initialize.apply(this, arguments);

    this.uiModel = new Backbone.Model({ menuIsOpen: false });
    this.listenTo(this.uiModel, 'change:menuIsOpen', this.onModelToggleMenu, this);
    this.listenTo(this.roomMenuModel, 'change:state:post', this.onMenuChangeState, this);
  },

  serializeData: function() {
    var data = parseForTemplate(this.model.toJSON(), this.roomMenuModel.get('state'));

    //When the user is viewing a room he is lurking in and activity occurs
    //we explicitly, in this case, cancel the lurk activity
    //this would be a lot easier (as with a lot of things) if we persisted activity on the server JP 17/3/16
    if (data.lurkActivity && (data.id === context.troupe().get('id'))) {
      data.lurkActivity = false;
    }

    return data;
  },

  render: function() {
    //TODO Figure out why there is soooo much rendering JP 5/2/16
    if (!Object.keys(this.model.changed)) { return; }

    // Using call since render never has any arguments and `.call` is much faster
    BaseCollectionItemView.prototype.render.call(this);
  },

  onRender: function (){
    BaseCollectionItemView.prototype.onRender.apply(this, arguments);
    this.onFavouriteChange();

  },

  onDestroy: function() {
    this.stopListening(this.uiModel);
  },

  onMenuChangeState: function () {
    var data = parseForTemplate(this.model.toJSON(), this.roomMenuModel.get('state'));

    if(data.namePieces) {
      // If we don't want to re-render, then we need to duplicate this template logic
      this.ui.title.html(data.namePieces.reduce(function(html, piece) { return html + '<span class="room-item__title-piece">' + piece + '</span>'; }, ''));
    }
    else {
      this.ui.title.html('<span class="room-item__title-piece">' + data.displayName || data.name + '</span>');
    }
  },

  //This is overly complex but that's where we are today...
  onFavouriteChange: function() {
    var model = this.model;

    if (model.get('oneToOne')) {
      if (model.get('favourite')) {
        this.el.classList.remove('room-item--one2one');
        this.el.classList.add('room-item--favourite-one2one');
      } else {
        this.el.classList.add('room-item--one2one');
        this.el.classList.remove('room-item--favourite-one2one');
      }
    } else {
      if (model.get('favourite')) {
        this.el.classList.remove('room-item');
        this.el.classList.add('room-item--favourite');
      } else {
        this.el.classList.add('room-item');
        this.el.classList.remove('room-item--favourite');
      }
    }

    var isFavourited = !!model.get('favourite');
    toggleClass(this.ui.favouriteButtonIcon[0], 'favourite', isFavourited);
  },

  onOptionsClicked: function(e) {
    //Stop this view triggering up to the parent
    e.stopPropagation();

    //stop this view from triggering a click on the anchor
    e.preventDefault();
    if (this.roomMenuModel.get('state') === 'search') { return; }

    this.uiModel.set('menuIsOpen', !this.uiModel.get('menuIsOpen'));
  },

  onModelToggleMenu: function(model, val) {// jshint unused: true
    toggleClass(this.el, 'active', val);
  },

  onMouseOut: function() {
    this.uiModel.set('menuIsOpen', false);
  },

  onClick: function(e) {
    e.preventDefault();
  },

  onHideClicked: function(e) {
    e.stopPropagation();

    // Hide the room in the UI immediately
    this.model.set('lastAccessTime', null);

    //TODO figure out why this throws an error.
    //implementation is exactly the same as on develop?
    //JP 13/1/16
    apiClient.user.delete('/rooms/' + this.model.id)
      .then(this.onHideComplete.bind(this))

      //TODO should this so some kind of visual error? JP
      .catch(this.onHideComplete.bind(this));
  },

  onHideComplete: function() {
    this.trigger('hide:complete');
  },

  onLeaveClicked: function(e) {
    e.stopPropagation();
    if (this.model.get('id') === context.getTroupeId()) {
      appEvents.trigger('about.to.leave.current.room');
    }

    apiClient.delete('/v1/rooms/' + this.model.get('id') + '/users/' + context.getUserId())
      .then(function() {
        this.trigger('leave:complete');
      }.bind(this));
  },

  onFavouriteClicked: function(e) {
    e.preventDefault();
    e.stopPropagation();

    var isFavourited = !!this.model.get('favourite');
    this.model.save({
      favourite: !isFavourited
    }, {
      wait: true,
      patch: true
    });
  },

});
