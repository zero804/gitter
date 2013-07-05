/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'utils/context',
  'views/app/userHeaderView',
  'collections/instances/troupes'
  ], function($, context, UserHeaderView, collections)  {
  "use strict";

  return UserHeaderView.extend({

    events: {
      "click .trpHeaderFavourite":        "toggleFavourite"
    },

    initialize: function() {
      UserHeaderView.prototype.initialize.apply(this, arguments);
    },

    getRenderData: function() {
      return {
        headerTitle: context.getTroupe().name,
        isTroupe: true,
        troupeContext: context(),
        user: context.getUser()
      };
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
        data: JSON.stringify({ favourite: isFavourite }),
        success: function() {

        },
        error: function() {

        }
      });

      window.troupeContext.troupe.favourite = isFavourite;
      var troupe = collections.troupes.get(window.troupeContext.troupe.id);
      troupe.set('favourite', isFavourite);
    }

  });

});