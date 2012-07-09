// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'collections/troupes',
  'collections/notifications',
  'noty'
], function($, _, Backbone, TroupeCollection, NotificationCollection, notyStub) {

  var AppView = Backbone.View.extend({
    el: 'body',

    initialize: function() {
      this.troupeCollection = new TroupeCollection();
      this.notificationCollection = new NotificationCollection();

      this.troupeSelectorMenu = $("#trpTroupeSelector");
      this.notificationSelectorMenu = $("#menu-notification-selector");

      this.troupeCollection.on('change', this.addAllTroupes, this);
      this.troupeCollection.on('add', this.addOneTroupe, this);
      this.troupeCollection.on('refresh', this.addAllTroupes, this);

      this.notificationCollection.on('change', this.addAllNotifications, this);
      this.notificationCollection.on('add', this.addOneNotification, this);
      this.notificationCollection.on('refresh', this.addAllNotifications, this);

      var self = this;
      this.troupeCollection.fetch({
        success: function() { self.addAllTroupes(); }
      });

      this.notificationCollection.fetch({
        success: function() { self.addAllNotifications(); }
      });

      $(document).on('userLoggedIntoTroupe', function(event, data) {
        if(data.userId == window.troupeContext.user.id) {
          return;
        }

        noty({
          "text": data.displayName + " has logged into the troupe.",
          "layout":"bottomRight",
          "type":"information",
          "animateOpen":{"height":"toggle"},
          "animateClose":{"height":"toggle"},
          "speed":500,
          "timeout":3000,
          "closeButton":false,
          "closeOnSelfClick":true,
          "closeOnSelfOver":false});
      });

      $(document).on('userLoggedOutOfTroupe', function(event, data) {
        noty({
          "text": data.displayName + " has left the troupe.",
          "layout":"bottomRight",
          "type":"information",
          "animateOpen":{"height":"toggle"},
          "animateClose":{"height":"toggle"},
          "speed":500,
          "timeout":3000,
          "closeButton":false,
          "closeOnSelfClick":true,
          "closeOnSelfOver":false});
      });

     $(document).on('notification', function(event, data) {
        self.notificationCollection.add(data, { at: 0 });
        noty({
          "text": data.notificationText,
          "layout":"bottomRight",
          "type":"information",
          "animateOpen":{"height":"toggle"},
          "animateClose":{"height":"toggle"},
          "speed":500,
          "timeout":3000,
          "closeButton":false,
          "closeOnSelfClick":true,
          "closeOnSelfOver":false});
      });
    },

    events: {
      //"keydown .chatbox":          "detectReturn"
         "click #trpSelectorArrow"  : "toggleSelector",
         "click #trpPersonIcon" : "toggleUserMenu"
    },

    toggleSelector: function(){
      if ($('#trpTroupeSelector').is(':hidden')) $('#trpTroupeSelector').slideDown('fast', function() {
          // Animation complete.
      });
      else $('#trpTroupeSelector').slideUp('fast', function() {
          // Animation complete.
      });
    },

    toggleUserMenu: function() {
      if ($('#trpUserMenu').is(':hidden')) $('#trpUserMenu').slideDown('fast', function() {
          // Animation complete.
      });
      else $('#trpUserMenu').slideUp('fast', function() {
          // Animation complete.
      });
    },

    addOneTroupe: function(model) {
      this.troupeSelectorMenu.append("<div class='trpTroupeSelectorItem'><a href='" + model.get("uri") + "'>"+ model.get("name") + "</a></div>");
    },

    addAllTroupes: function() {
      this.troupeSelectorMenu.empty();
      this.troupeCollection.each(this.addOneTroupe, this);
      this.troupeSelectorMenu.append("<div class='trpTroupeSelectorAdd'><a href=''>Start a new Troupe</a></div>");
    },

    addOneNotification: function(model, collection, options) {
      var item = "<li><a href='" + model.get("notificationLink") + "'>"+ model.get("notificationText") + "</a></li>";

      if(options.index === 0) {
        this.notificationSelectorMenu.prepend(item);
      } else {
        this.notificationSelectorMenu.append(item);
      }
    },

    addAllNotifications: function() {
      this.notificationSelectorMenu.empty();
      this.notificationCollection.each(this.addOneNotification, this);
    }

  });

  return AppView;
});
