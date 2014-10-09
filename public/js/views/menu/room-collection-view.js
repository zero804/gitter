define([
  'jquery',
  'utils/context',
  'utils/room-name-trimmer',
  'marionette',
  'hbs!./tmpl/room-list-item',
  'utils/appevents',
  'views/base',
  'cocktail',
  'utils/dataset-shim',
  'jquery-sortable', // No ref
  'bootstrap_tooltip' // No ref
], function($, context, roomNameTrimmer, Marionette, roomListItemTemplate, appEvents,  TroupeViews, cocktail, dataset) {
  "use strict";

  /* @const */
  var MAX_UNREAD = 99;

  /* @const */
  var MAX_NAME_LENGTH = 25;

  function getIconClass(model) {
    var iconName = model.get('githubType').toLowerCase();

    // repo_channel, user_channel etc
    if(iconName.indexOf('channel') >= 0) {
      iconName = 'channel';
    }

    if(model.get('favourite')) {
      iconName = 'favourite';
    }

    return 'room-list-item__name--' + iconName;
  }

  var RoomListItemView = Marionette.ItemView.extend({
    tagName: 'li',
    className: 'room-list-item',
    template: roomListItemTemplate,
    modelEvents: {
      'change:unreadItems change:lurk change:activity change:mentions': 'render'
    },
    events: {
      'click': 'clicked',
      'click .js-close-button': 'onItemClose',
      'click .js-leave-button': 'onItemLeave'
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
    updateCurrentRoom: function(newUrl) {
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
      data.iconClass = getIconClass(this.model);
      return data;
    },
    onItemClose: function(e) {
      // stop click event triggering navigate
      e.stopPropagation();

      $.ajax({
        url: "/api/v1/user/" + context.getUserId() + "/rooms/" + this.model.id,
        data: "",
        type: "DELETE",
      });

    },

    onItemLeave: function(e) {
      // stop click event triggering navigate
      e.stopPropagation();

      $.ajax({
        url: "/api/v1/rooms/" + this.model.id + "/users/" + context.getUserId(),
        data: "",
        type: "DELETE",
      });
    },

    onRender: function() {
      var self = this;

      this.$el.toggleClass('room-list-item--current-room', this.isCurrentRoom);

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

      this.$el.find('.js-close-button').tooltip({placement: 'left'});
      this.$el.find('.js-leave-button').tooltip({placement: 'left'});

    },
    clearSearch: function() {
      $('#list-search-input').val('');
      $('#list-search').hide();
      $('#list-mega').show();
    },
    clicked: function() {
      var model = this.model;
      var self = this;
      setTimeout(function() {
        // Make things feel a bit more responsive, but not too responsive
        self.clearSearch();
      }, 150);

    if(this.model.get('exists') === false) {
        window.location.hash = '#confirm/' + this.model.get('uri');
      } else {
        appEvents.trigger('navigation', model.get('url'), 'chat', model.get('name'), model.id);
      }
    }
  });

  var CollectionView = Marionette.CollectionView.extend({
    tagName: 'ul',
    className: 'room-list',
    itemView: RoomListItemView,

    initialize: function(options) {
      if(options.rerenderOnSort) {
        this.listenTo(this.collection, 'sort', this.render);
      }
      if(options.draggable) {
        this.makeDraggable(options.dropTarget);
      }
      this.roomsCollection = options.roomsCollection;
    },
    makeDraggable: function(drop) {
      var cancelDrop = false;
      var self = this;
      this.$el.sortable({
        group: 'mega-list',
        pullPlaceholder: false,
        drop: drop,
        distance: 8,
        onDrag: function($item, position) {
          $(".placeholder").html($item.html());
          $item.css(position);
        },
        isValidTarget: function($item, container) {
          if (container.el.parent().attr('id') == 'list-favs') {
            $('.dragged').hide();
            return true;
          }
          else {
            $('.dragged').show();
            return false;
          }
        },
        onDrop: function (item, container, _super) {
          var el = item[0];
          if (!cancelDrop) {
            var previousElement = el.previousElementSibling;
            var favPosition;
            if(!previousElement) {
              favPosition = 1;
            } else {
              var previousCollectionItem = self.roomsCollection.get(dataset.get(previousElement, 'id'));
              favPosition = previousCollectionItem.get('favourite') + 1;
            }
            var collectionItem = self.roomsCollection.get(dataset.get(el, 'id'));
            collectionItem.set('favourite', favPosition);
            collectionItem.save();
          }
          cancelDrop = false;
          _super(item, container);
        },
        onCancel: function(item, container) {
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

  cocktail.mixin(CollectionView, TroupeViews.SortableMarionetteView);

  return CollectionView;

});
