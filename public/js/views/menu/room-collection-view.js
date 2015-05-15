"use strict";
var $ = require('jquery');
var Popover = require('views/popover');
var context = require('utils/context');
var resolveIconClass = require('utils/resolve-icon-class');
var apiClient = require('components/apiClient');
var roomNameTrimmer = require('utils/room-name-trimmer');
var Marionette = require('backbone.marionette');
var roomListItemTemplate = require('./tmpl/room-list-item.hbs');
var popoverTemplate = require('./tmpl/leave-buttons.hbs');
var appEvents = require('utils/appevents');
var dataset = require('utils/dataset-shim');
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

      // We can't use the room resource as the room might not be the current one
      apiClient
        .delete('/v1/rooms/' + this.model.id + '/users/' + context.getUserId())
        .then(function () {
          // leaving the room that you are in should take you home
          if (this.model.get('url') === window.location.pathname) {
            appEvents.trigger('navigation', context.getUser().url, 'home', '');
          }
        }.bind(this))
        .then(function() {
          this.parentPopover.hide();
        }.bind(this));
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
      'change:unreadItems change:lurk change:activity change:mentions change:name': 'render'
    },
    events: {
      'click': 'clicked',
      'click .js-close-button': 'showPopover'
    },
    showPopover: function(e) {
      e.stopPropagation(); // no navigation

      var popover = new Popover({
        view: new PopoverBodyView({model: this.model}),
        targetElement: e.target,
        placement: 'horizontal'
      });
      popover.show();
      Popover.singleton(this, popover);
    },
    initialize: function() {
      this.updateCurrentRoom();

      this.listenTo(appEvents, 'navigation', function(url) {
        // strip off query params etc
        var parser = document.createElement('a');
        parser.href = url;

        this.updateCurrentRoom(parser.pathname);
      });
    },

    updateCurrentRoom: function (newUrl) {
      var url = newUrl || window.location.pathname;
      var isCurrentRoom = this.model.get('url') === url;

      if(this.isCurrentRoom !== isCurrentRoom) {
        // cannot be stored on the model as it will get wiped by faye
        this.isCurrentRoom = isCurrentRoom;
        this.render();
      }
    },

    serializeData: function() {
      var data = this.model.toJSON();
      data.name = roomNameTrimmer(data.name, MAX_NAME_LENGTH);
      data.iconClass = resolveIconClass(this.model);
      return data;
    },
    onRender: function() {
      var self = this;
      this.$el.toggleClass('room-list-item--current-room', !!this.isCurrentRoom);

      var m = self.model;
      dataset.set(self.el, 'id', m.id);
      var e = self.$el;

      var first = !self.initialRender;
      self.initialRender = true;

      if(!!first && !m.changed) return;

      var unreadBadge = e.find('.js-unread-badge');
      var lurk = self.model.get('lurk');
      var mentions = self.model.get('mentions');
      var ui = self.model.get('unreadItems');
      var activity = self.model.get('activity');

      function getBadgeText() {
        if(mentions) return "@";

        if(lurk) return;

        if(ui) {
          if(ui > MAX_UNREAD) return "99+";
          return ui;
        }
      }


      var text = getBadgeText() || "";
      unreadBadge.text(text);
      unreadBadge.toggleClass('shown', !!text);
      unreadBadge.toggleClass('mention', !!mentions);

      if(lurk && !mentions) {
        e.toggleClass('chatting', !!activity);

        if(activity && 'activity' in m.changed) {
          e.addClass('chatting-now');
        }

        if(self.timeout) {
          clearTimeout(self.timeout);
        }

        self.timeout = setTimeout(function() {
          delete self.timeout;
          if(self.model.id === context.getTroupeId()) {
            e.removeClass('chatting chatting-now');
          } else {
            e.removeClass('chatting-now');
          }

        }, 1600);

      } else {
        // Not lurking
        e.removeClass('chatting chatting-now');
      }

    },
    clearSearch: function() {
      $('#list-search-input').val('');
      $('#list-search').hide();
      $('#list-mega').show();
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
          if (!a) debugger;
          return a;
        },

        isValidTarget: function(item, container) { // jshint unused:true
          var droppedAt = this.getDropTarget(container.el);
          console.log('target is ' + droppedAt);
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
              model.set('favourite', position);
              model.save();
            } else if (droppedAt === 'recents') {
              model.set('favourite', null);
              model.save();
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
            collectionItem.set('favourite', false).save();

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
