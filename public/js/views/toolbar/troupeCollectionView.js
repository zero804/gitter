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
      change: 'render',
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
    onRender: function() {
      this.el.dataset.id = this.model.id;
      if (this.model.attributes.favourite) {
        this.$el.addClass('item-fav');
      }
    },
    clicked: function() {
      var model = this.model;
      setTimeout(function() {
        // Make things feel a bit more responsive, but not too responsive
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
