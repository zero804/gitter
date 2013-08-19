/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  "views/base",
  "hbs!./tmpl/headerView",
  'collections/instances/troupes',
  'utils/context',
  'components/unread-items-client'
  ], function($, TroupeViews, template, trpCollections, context, unreadItemsClient) {
  "use strict";

  return TroupeViews.Base.extend({
    template: template,

    events: {
      "click .trpHeaderFavourite":        "toggleFavourite"
    },

    initialize: function() {
      var self = this;

      trpCollections.troupes.on('change', function(model) {
        if (model.id == context.getTroupeId()) {
          // header title
          $('.trpHeaderTitle').html(model.get('name'));
          // window / title bar
          self.updateTitlebar(unreadItemsClient.getCounts());
        }
      });

      function onTroupeUnreadTotalChange(event, values) {
        self.updateTitlebar(values);

        function updateBadge(selector, count) {
          var badge = $(selector);
          badge.text(count);
          if(count > 0) {
            badge.show();
          } else {
            badge.hide();
          }
        }

        // overall count
        updateBadge('#unread-badge', values.overall);
      }

      $(document).on('troupeUnreadTotalChange', onTroupeUnreadTotalChange);
      onTroupeUnreadTotalChange(null, unreadItemsClient.getCounts());

    },

    getRenderData: function() {
      var user = context.getUser();
      var troupe = context.getTroupe();

      return {
        headerTitle: troupe && troupe.name || user.displayName,
        isTroupe: !!troupe,
        oneToOne: context.inOneToOneTroupeContext(),
        user: user,
        favourite: troupe && troupe.favourite
      };

    },

    updateTitlebar: function(values) {
      $('title').html(this.getTitlebar(values));
    },

    getTitlebar: function(counts) {
      var mainTitle;
      if (context.getTroupe()) {
        mainTitle = context.getTroupe().name + " - Troupe";
      } else {
        mainTitle = "Troupe";
      }

      // TODO this isn't working properly when updating the troupe name, need to be able to poll unreadItems count not just accept the event
      var overall = counts.overall;
      var current = counts.current;
      if(overall <= 0) {
        return mainTitle;
      }

      if(overall <= 10) {
        if(current > 0) {
          return String.fromCharCode(0x2789 + overall) + ' ' + mainTitle;
        }

        return String.fromCharCode(0x277F + overall) + ' ' + mainTitle;
      }

      return '[' + overall + '] ' + mainTitle;
    },

    toggleFavourite: function() {
      var favHeader = $('.trpHeaderFavourite');
      favHeader.toggleClass('favourited');
      var isFavourite = favHeader.hasClass('favourited');

      $.ajax({
        url: '/troupes/' + context.getTroupeId(),
        contentType: "application/json",
        dataType: "json",
        type: "PUT",
        data: JSON.stringify({ favourite: isFavourite })
      });

      // The update should happen automatically via a patch operation....
      //window.troupeContext.troupe.favourite = isFavourite;
      //var troupe = collections.troupes.get(window.troupeContext.troupe.id);
      //troupe.set('favourite', isFavourite);
    }

  });

});