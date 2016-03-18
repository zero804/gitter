'use strict';

var Marionette = require('backbone.marionette');
var Backbone = require('backbone');

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
    createRoomButton: '.js-explore-create-room-button'
  },
  events: {
    'click @ui.createRoomButton': 'popCreateRoomModal'
  },

  initialize: function() {
    //console.log('explore init');
  },

  initRoomCardListView: function(optionsForRegion) {
    return new RoomCardListView(optionsForRegion({ }));
  },
  initTagPillListView: function(optionsForRegion) {
    return new TagPillListView(optionsForRegion({ }));
  },

  popCreateRoomModal: function() {
    //console.log('popping create room modal');

    require.ensure(['views/modals/create-room-view'], function(require) {
      var createRoomView = require('views/modals/create-room-view');
      var createRoomModal = new createRoomView.Modal({});
      createRoomModal.show();
    });
  }
});

module.exports = ExploreView;
