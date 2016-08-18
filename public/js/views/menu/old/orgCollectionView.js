"use strict";

var Marionette = require('backbone.marionette');
var orgListItemTemplate = require('./tmpl/org-list-item.hbs');
var appEvents = require('../../../utils/appevents');
var troupesCollections = require('collections/instances/troupes');
var resolveRoomAvatarSrcSet = require('gitter-web-shared/avatars/resolve-room-avatar-srcset');


module.exports = (function() {


  var OrgItemView = Marionette.ItemView.extend({
    tagName: 'li',

    className: 'room-list-item',

    template: orgListItemTemplate,

    modelEvents: {
      change: 'render',
    },

    events: {
      click: 'clicked'
    },

    serializeData: function() {
      var data = this.model.toJSON();
      data.roomAvatarSrcSet = resolveRoomAvatarSrcSet({uri: data.name}, 16);
      return data;
    },

    clicked: function(e) {
      e.preventDefault();

      if (this.model.get('room')) {
        appEvents.trigger('navigation', '/' + this.model.get('name'), 'chat', this.model.get('name'), null);
        return;
      }

      // An org could not have a 'room' at render time but someone else could have meanwhile created the org
      // room and added you. So we'll look it up in the live collection of troupes and navigate if exists.
      var exists = troupesCollections.troupes.findWhere({uri: this.model.get('name')});

      if (exists) {
        appEvents.trigger('navigation', '/' + this.model.get('name'), 'chat', this.model.get('name'), null);
      } else {
        window.location.hash = '#confirm/' + this.model.get('name');
      }
    }
  });

  return Marionette.CollectionView.extend({
    tagName: 'ul',
    className: 'room-list',
    childView: OrgItemView,
    childViewOptions: function (item) {
      var options = {};
      if (item) {
        var id = item.get('id'); // NB ID attribute is not the id!
        options.el = this.$el.find('.room-list-item[data-id="' + id + '"]')[0];
      }
      return options;
    },

  });


})();
