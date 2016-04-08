/* jshint maxcomplexity:13 */
"use strict";
var $ = require('jquery');
var Popover = require('views/popover');
var context = require('utils/context');
var apiClient = require('components/apiClient');
var roomNameTrimmer = require('utils/room-name-trimmer');
var Marionette = require('backbone.marionette');
var roomListItemTemplate = require('./tmpl/room-list-item.hbs');
var popoverTemplate = require('./tmpl/leave-buttons.hbs');
var appEvents = require('utils/appevents');
var dataset = require('utils/dataset-shim');
var toggle = require('utils/toggle');
var toggleClass = require('utils/toggle-class');
var resolveRoomAvatarSrcSet = require('gitter-web-shared/avatars/resolve-room-avatar-srcset');

require('jquery-sortable');


module.exports = (function() {

  var PopoverBodyView = Marionette.ItemView.extend({
    className: 'commit-popover-body',
    template: popoverTemplate,
    events: {
      'click .js-close-button': 'onItemClose',
      'click .js-leave-button': 'onItemLeave'
    },
    onItemClose: function(e) {
      e.stopPropagation(); // no navigation

      // We can't use the userRoom as the room might not be the current one
      apiClient.user.delete("/rooms/" + this.model.id)
        .then(function() {
          this.parentPopover.hide();
        }.bind(this));
    },
    onItemLeave: function(e) {
      e.stopPropagation(); // no navigation
      var self = this;

      if (self.model.id === context.getTroupeId()) {
        appEvents.trigger('about.to.leave.current.room');
      }

      // We can't use the room resource as the room might not be the current one
      apiClient
        .delete('/v1/rooms/' + self.model.id + '/users/' + context.getUserId())
        .then(function () {
          // leaving the room that you are in should take you home
          if (self.model.id === context.getTroupeId()) {
            appEvents.trigger('navigation', '/home', 'home', '');
          }

          self.parentPopover.hide();
        });
    }
  });


  /* @const */
  var MAX_UNREAD = 99;

  /* @const */
  var MAX_NAME_LENGTH = 25;

  var RoomListItemView = Marionette.ItemView.extend({
    tagName: 'li',
    className: 'room-list-item',
    template: roomListItemTemplate,
    modelEvents: {
      'change:unreadItems change:lurk change:activity change:mentions change:name change:currentRoom': 'updateRender',
    },
    events: {
      'click': 'clicked',
      'click .js-close-button': 'showPopover'
    },
    ui: {
      unreadBadge: '#unread-badge',
      roomName: '#room-name'
    },
    showPopover: function(e) {
      e.stopPropagation(); // no navigation

      var popover = new Popover({
        view: new PopoverBodyView({model: this.model}),
        targetElement: e.target,
        placement: 'horizontal',
        width: '100px'
      });
      popover.show();
      Popover.singleton(this, popover);
    },

    serializeData: function() {
      var data = this.model.toJSON();
      data.name = roomNameTrimmer(data.name, MAX_NAME_LENGTH);
      data.roomAvatarSrcSet = resolveRoomAvatarSrcSet({ uri: data.url }, 16);
      return data;
    },

    onRender: function() {
      this.updateRender(null); // Null means its the initial render
    },

    updateRender: function(model) {
      var changed = model && model.changed;
      var attributes = model && model.attributes || this.model.attributes;

      function hasChanged(property) {
        return changed && changed.hasOwnProperty(property);
      }

      var el = this.el;
      var m = this.model;

      if (!changed || hasChanged('currentRoom')) {
        toggleClass(el, 'room-list-item--current-room', attributes.currentRoom);
        if (attributes.currentRoom) toggleClass(el, 'chatting', false);
      }

      if (!changed) { // Only on first render
        dataset.set(el, 'id', m.id);
      }

      if (changed && hasChanged('name')) {
        this.ui.roomName.text(roomNameTrimmer(attributes.name, MAX_NAME_LENGTH));
      }

      if (!changed || (hasChanged('mentions') || hasChanged('activity') || hasChanged('unreadItems') || hasChanged('lurk'))) {
        var switches = this.getActivitySwitches(attributes, changed);

        var unreadBadgeEl = this.ui.unreadBadge[0];
        unreadBadgeEl.textContent = switches.badgeText;
        toggle(unreadBadgeEl, switches.badge);
        toggleClass(unreadBadgeEl, 'mention', switches.mention);
        toggleClass(el, 'chatting', switches.chatting);
        toggleClass(el, 'chatting-now', switches.chattingNow);

        if (switches.chattingNow) {
          clearTimeout(this.timeout);
          this.timeout = setTimeout(this.stopActivityPulse.bind(this), 1600);
        }

      }

    },

    stopActivityPulse: function() {
      delete this.timeout;
      var el = this.el;

      if(this.model.id === context.getTroupeId()) {
        toggleClass(el, 'chatting', false);
        toggleClass(el, 'chatting-now', false);
      } else {
        toggleClass(el, 'chatting-now', false);
      }
    },

    /**
     * Choose the first rule which applies
     * 1. `mentions > 0`: badge=visible mentionsClass=1 chatting=0
     * 2. `unreadItems > 0`: badge=visible mentionsClass=0 chatting=0
     * 3. `lurk`:
     *     1: `activity+changed`: badge=hidden mentionsClass=0 chatting=1 + chatting now
     *     2: `activity`: badge=hidden mentionsClass=0 chatting=1
     * 4. Otherwise: badge=hidden mentionsClass=0 chatting=0 chattingNow=0
     */
    getActivitySwitches: function(attributes, changed) {
      var result = {
        badge: false,
        mention: false,
        badgeText: "",
        chatting: false,
        chattingNow: false
      };

      if (attributes.mentions) {
        result.badge = true;
        result.mention = true;
        result.badgeText = "@";
        return result;
      }

      var unreadItems = attributes.unreadItems;
      if (unreadItems) {
        result.badge = true;
        result.badgeText = unreadItems > MAX_UNREAD ? "99+" : unreadItems;
        return result;
      }

      if (attributes.lurk && attributes.activity) {
        result.chatting = true;
        result.chattingNow = changed && changed.hasOwnProperty('activity');
      }

      return result;
    },
    clicked: function() {
      var model = this.model;
      if(this.model.get('exists') === false) {
        window.location.hash = '#confirm/' + model.get('uri');
      } else {
        if (this.model.get('url') !== window.location.pathname) {
          appEvents.trigger('navigation', model.get('url'), 'chat', model.get('name'), model.id);
        }
      }
    }
  });

  var CollectionView = Marionette.CollectionView.extend({

    childView: RoomListItemView,

    childViewOptions: function (item) {
      var options = {};
      if (item && item.id) {
        options.el = this.$el.find('.room-list-item[data-id="' + item.id + '"]')[0];
        if (options.el && $(options.el).hasClass('dragged')) {
          delete options.el;
        }
      }
      return options;
    },

    initialize: function (options) {
      if (options.draggable) {
        this.makeDraggable(options.dropTarget);
      }

      this.roomsCollection = options.roomsCollection;

      this.listenTo(context.troupe(), 'change:id', this.onRoomChange, this);
    },

    onRoomChange: function(){
      //deselect the current room
      var currentlySelectedRoom = this.collection.where({ currentRoom: true})[0];
      if (currentlySelectedRoom) currentlySelectedRoom.set('currentRoom', false);

      //select new room
      var newlySelectedRoom = this.collection.get(context.troupe().get('id'));
      if (newlySelectedRoom) newlySelectedRoom.set('currentRoom', true);

    },

    makeDraggable: function(drop) {
      var cancelDrop = false;
      var self = this;

      this.$el.sortable({
        connectWith: '.room-list',
        group: 'list-mega',
        pullPlaceholder: false,
        drop: drop,
        distance: 8,

        onDrag: function (item, position) {
          $(".placeholder").html(item.html());
          $('.placeholder').addClass(item.attr('class'));
          item.css(position);
        },

        getDropTarget: function($el) {
          var a = $el.data('dropTarget') || $el.parents('[data-drop-target]').data('dropTarget');
          return a;
        },

        isValidTarget: function(item, container) { // jshint unused:true
          var droppedAt = this.getDropTarget(container.el);
          if (droppedAt === 'favs') {
            $('.dragged').hide();
            $('.placeholder').show();
            return true;
          }

          if (droppedAt === 'recents') {
            $('.dragged').show();
            $('.placeholder').hide();
            return true;
          }

          return false;
        },

        onDrop: function (item, container, _super) {
          var position;
          var el = item[0];
          var model = self.roomsCollection.get(dataset.get(el, 'id'));
          var droppedAt = this.getDropTarget(container.el);

          if (!cancelDrop) {
            if (droppedAt === 'favs') {
              var previousElement = el.previousElementSibling;

              if (!previousElement) {
                position = 1;
              } else {
                var previousModel = self.roomsCollection.get(dataset.get(previousElement, 'id'));
                position = previousModel.get('favourite') + 1;
              }
              model.save({ favourite: position }, { patch: true });
            } else if (droppedAt === 'recents') {
              model.save({ favourite: null }, { patch: true });
            }
          }
          cancelDrop = false;
          _super(item, container);
        },

        onCancel: function (item, container) {
          cancelDrop = true;
          var el = item[0];

          if ($(container.el).parent().attr('id') == 'list-favs') {
            var collectionItem = self.roomsCollection.get(dataset.get(el, 'id'));
            collectionItem.save({ favourite: false }, { patch: true });

            // do whatever else needs to be done to remove from favourites and store positions
            // TODO: at the moment if you remove all items, the UL takes up space and that makes no sense!
            item.remove();
            cancelDrop = true;
          }
        }
      });
    },
  });

  return CollectionView;


})();
