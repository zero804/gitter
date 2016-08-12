'use strict';

var $ = require('jquery');
var Marionette = require('backbone.marionette');
var urlParse = require('url-parse');
var context = require('utils/context');
var frameUtils = require('utils/frame-utils');
var modalRegion = require('components/modal-region');
var LoginView = require('views/modals/login-view');
var template = require('./tmpl/explore-view.hbs');
var itemTemplate = require('../../../templates/partials/room_card.hbs');

require('views/behaviors/isomorphic');


var TagPillView = Marionette.ItemView.extend({
  template: itemTemplate,
  tagName: 'li',
  events: {
    'click': 'onClick'
  },
  initialize: function() {
    //console.log('tagPillView init');
  },

  onClick: function() {
    //console.log('click tag pill');
  }
});

var TagPillListView = Marionette.CollectionView.extend({
  childView: TagPillView,
  initialize: function() {
    //console.log('tagPillListView init');
  }
});



var RoomCardView = Marionette.ItemView.extend({
  template: itemTemplate,
  tagName: 'div',

  popEditTagsModal: function() {
    require.ensure(['views/modals/edit-tags-view'], function(require) {
      var EditTagsView = require('views/modals/edit-tags-view');
      var editTagsModal = new EditTagsView({
        roomId: 0 // FIXME: the room id
      });
      editTagsModal.show();
    });
  }
});

var RoomCardListView = Marionette.CollectionView.extend({
  childView: RoomCardView,
  initialize: function() {
    //console.log('roomCardListView init');
  }
});


var ExploreView = Marionette.LayoutView.extend({
  template: template,
  behaviors: {
    Isomorphic: {
      tagPillList: {
        el: '.js-explore-tag-pill-list',
        init: 'initTagPillListView'
      },
      roomCardList: {
        el: '.js-room-card-list',
        init: 'initRoomCardListView'
      }
    }
  },
  regions: {
    dialogRegion: 'body'
  },
  ui: {
    signInButton: '.js-sign-in',
    createRoomButton: '.js-explore-create-button'
  },
  events: {
    'click @ui.signInButton': 'popSignInModal',
    'click @ui.createRoomButton': 'popCreate'
  },

  initialize: function() {
    //console.log('explore init');

    $('.js-explore-tag-pill[data-needs-authentication]').on('click', this.popSignInModal);
  },

  initRoomCardListView: function(optionsForRegion) {
    return new RoomCardListView(optionsForRegion({ }));
  },
  initTagPillListView: function(optionsForRegion) {
    return new TagPillListView(optionsForRegion({ }));
  },

  popSignInModal: function(e) {
    var href = $(e.currentTarget).attr('href');
    var parsedUrl = urlParse(href, true);

    var modal = new LoginView(parsedUrl.query);
    modalRegion.show(modal);
    // hack this modal because we're not using history or routing here
    modal.navigable = false;

    e.preventDefault();
  },

  popCreate: function() {
    frameUtils.postMessage({ type: 'community-create-view:toggle', active: true });
  }
});

module.exports = ExploreView;
