/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'utils/context',
  'marionette',
  'hbs!./tmpl/troupeListItem',
  'utils/appevents',
  'utils/momentWrapper',
  'views/base',
  'cocktail',
  'jquery-sortable' // No ref
], function($, context, Marionette, troupeListItemTemplate, appEvents, moment,  TroupeViews, cocktail) {
  "use strict";

  var createRoom = context.getUser().createRoom;
  /* @const */
  var MAX_UNREAD = 99;

  var TroupeItemView = Marionette.ItemView.extend({
    tagName: 'li',
    template: troupeListItemTemplate,
    modelEvents: {
      'change:unreadItems change:lurk change:activity': 'render'
    },
    events: {
      'click':              'clicked',
      'click .item-close':  'onItemClose'
    },
    serializeData: function() {
      var data = this.model.toJSON();
      data.createRoom = createRoom;
      return data;
    },
    onItemClose: function(e) {
      //may not need this e.preventDefault stuff, had this because of the old <A HREF>
      e.preventDefault();
      e.stopPropagation();
      this.model.destroy();
    },

    onRender: function() {
      var self = this;

      var m = self.model;
      self.el.dataset.id = m.id;
      var e = self.$el;

      var first = !self.initialRender;
      self.initialRender = true;

      if(!!first && !m.changed) return;

      var unreadBadge = e.find('.item-unread-badge');
      var lurk = self.model.get('lurk');

      if(first || 'lurk' in m.changed) {
        if(lurk) {
          unreadBadge.removeClass('shown');
        } else {
          e.removeClass('chatting chatting-now');
        }
      }

      if(first || 'activity' in m.changed) {
        var activity = self.model.get('activity');

        if(lurk && activity) {
          e.addClass('chatting chatting-now');

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
          e.removeClass('chatting chatting-now');
        }
      }

      if(first || 'unreadItems' in m.changed) {
        var ui = self.model.get('unreadItems');
        if(ui) {
          if(ui > MAX_UNREAD) {
            ui = "99+";
          }
          unreadBadge.find('span').text(ui);
          unreadBadge.addClass('shown');
        } else {
          unreadBadge.removeClass('shown');
        }
      }

      if(first || 'favourite' in m.changed) {
        var f = self.model.get('favourite');
        if(f) {
          e.addClass('item-fav');
        } else {
          e.removeClass('item-fav');
        }
      }
    },
    clearSearch: function() {
      $('#list-search-input').val('');
      $('#list-search').hide();
      $('#list-mega').show();
    },
    clicked: function() {
      var model = this.model;
      var self=this;
      setTimeout(function() {
        // Make things feel a bit more responsive, but not too responsive
        self.clearSearch();
        model.set('lastAccessTime', moment());
      }, 150);

      appEvents.trigger('navigation', model.get('url'), 'chat', model.get('name'), model.id);
    }
  });

  var CollectionView = Marionette.CollectionView.extend({
    tagName: 'ul',
    className: 'trpTroupeList',
    itemView: TroupeItemView,

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
              var previousCollectionItem = self.roomsCollection.get(previousElement.dataset.id);
              favPosition = previousCollectionItem.get('favourite') + 1;
            }
            var collectionItem = self.roomsCollection.get(el.dataset.id);
            collectionItem.set('favourite', favPosition);
            collectionItem.save();
            // if ($(container.el).attr('id') == 'list-favs') {
            //   // do whatever else needs to be done to add to favourites and store positions
              item.addClass("item-fav");
            // }
          }
          cancelDrop = false;
          _super(item, container);
        },
        onCancel: function(item, container) {
          cancelDrop = true;
          var el = item[0];

          if ($(container.el).parent().attr('id') == 'list-favs') {
            var collectionItem = self.roomsCollection.get(el.dataset.id);
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
