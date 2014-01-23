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

  var TroupeItemView = Marionette.ItemView.extend({
    tagName: 'li',
    template: troupeListItemTemplate,
    modelEvents: {
      'change:unreadItems': 'render',
      'change:activity change:unreadItems': 'onActivity'
    },
    events: {
      click: 'clicked', //WHY DOES THIS LOOK DIFFERENT TO NORMAL?
      'click .item-close': 'onItemClose'
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

    onActivity: function() {
      var a = this.model.get('activity');
      var e = this.$el;

      if(a) {
        e.addClass('chatting chatting-now');
        setTimeout(function() {
          e.removeClass('chatting-now');
        }, 2000);
      } else {
        e.removeClass('chatting');
      }
    },
    onRender: function() {
      this.el.dataset.id = this.model.id;
      if (this.model.attributes.favourite) {
        this.$el.addClass('item-fav');
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
        onDrag: function($item, position, _super) {
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
      // $("ul.list-recents").sortable({
      //   group: 'mega-list',
      //   pullPlaceholder: false,
      //   drop: false,
      // });
    },
  });

  cocktail.mixin(CollectionView, TroupeViews.SortableMarionetteView);

  return CollectionView;

});
