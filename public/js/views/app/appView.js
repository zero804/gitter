// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'collections/troupes',
  'collections/notifications',
  'views/base',
  'views/signup/signupModalView',
  'views/share/shareModalView',
  'views/widgets/nav',
  'noty'
], function($, _, Backbone, troupeModels, notificationModels, TroupeViews, SignupModalView, ShareModalView, NavView) {
  "use strict";

  var AppView = Backbone.View.extend({
    el: 'body',

    events: {
        "click .menu-profile": "profileMenuClicked",
        "click .menu-settings": "settingsMenuClicked",
        "click .menu-signout": "signoutMenuClicked",
        "click .troupe-selector"  : "toggleSelector",
        "click .add-troupe" : "addTroupeClicked",
        "click .menu-add-troupe" : "addTroupeClicked",
        "click .menu-add-person" : "showShareView"
         //"click #trpPersonIcon" : "toggleUserMenu"
    },

    initialize: function(options) {
      var self = this;
      this.router = options.router;

      _.bindAll(this, 'profileMenuClicked', 'settingsMenuClicked', 'signoutMenuClicked', 'toggleSelector', 'addTroupeClicked');

      function attachNavView(selector) {
        var e = self.$el.find(selector);
        return new NavView({ el: e }).render();
      }

      this.nav = {
        'everything': attachNavView('#nav-everything'),
        'chat': attachNavView('#nav-chat'),
        'mail': attachNavView('#nav-mail'),
        'files': attachNavView('#nav-files'),
        'people': attachNavView('#nav-people')
      };

      $.ajax({
        url: "/troupes/" + window.troupeContext.troupe.id + "/users",
        contentType: "application/json",
        dataType: "json",
        type: "GET",
        success: function(data) {
          var members = data.length; 
          $.ajax({
            url: "/troupes/" + window.troupeContext.troupe.id + "/invites",
            contentType: "application/json",
            dataType: "json",
            type: "GET",
            success: function(data) {
              members = members + data.length;
              if (members== 1) self.showShareView();
            }
          });

        }
      });



      this.troupeCollection = new troupeModels.TroupeCollection();
      //this.notificationCollection = new NotificationCollection();


      this.troupeSelectorMenu = new TroupeViews.Menu({ el: "#troupe-selector", triggerEl: "#menu-notification-selector" });

      this.userMenu = new TroupeViews.Menu({ el: "#troupe-user-menu", triggerEl: "#person-icon" });
      this.addPersonMenu = new TroupeViews.Menu({ el: "#troupe-add-menu", triggerEl: "#add-icon" });
      this.notifyMenu = new TroupeViews.Menu({ el: "#troupe-notify-menu", triggerEl: "#notify-icon" });

      this.troupeCollection.on('change', this.addAllTroupes, this);
      this.troupeCollection.on('add', this.addOneTroupe, this);
      this.troupeCollection.on('refresh', this.addAllTroupes, this);

      /*
      this.notificationCollection.on('change', this.addAllNotifications, this);
      this.notificationCollection.on('add', this.addOneNotification, this);
      this.notificationCollection.on('refresh', this.addAllNotifications, this);
      */

      this.troupeCollection.fetch({
        success: function() { self.addAllTroupes(); }
      });

      /*
      this.notificationCollection.fetch({
        success: function() { self.addAllNotifications(); }
      });
      */

      $(document).on('chat', function(event, data) {
        self.nav['chat'].incrementNotificationValue();
      });

      $(document).on('file', function(event, data) {
        self.nav['files'].incrementNotificationValue();
      });

      $(document).on('mail', function(event, data) {
        console.log(arguments);
        self.nav['mail'].incrementNotificationValue();
      });

      $(document).on('userLoggedIntoTroupe', function(event, data) {
        if(data.userId == window.troupeContext.user.id) {
          return;
        }

        $.noty({
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
        $.noty({
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
        //self.notificationCollection.add(data, { at: 0 });
        $.noty({
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

    toggleSelector: function(){
      console.log("Selector clicked");
      if ($('#troupe-selector').is(':hidden')) {
        $('#troupe-selector').slideDown(350, function() {
          });
        return false;
      }
      else $('#troupe-selector').slideUp(350, function() {
          // Animation complete.
      });
    },

    profileMenuClicked: function() {
      console.log(JSON.stringify(window.troupeContext));
      require(['views/profile/profileModalView'], function(ProfileModalView) {
        var view = new ProfileModalView({ existingUser: true });
        var modal = new TroupeViews.Modal({ view: view });

        view.on('profile.complete', function(data) {
          modal.off('profile.complete');
          modal.hide();
        });
        modal.show();
      });
    },

    settingsMenuClicked: function() {
      troupeApp.navigate("settings", {trigger: true});
      return false;
    },

    signoutMenuClicked: function() {
      troupeApp.navigate("signout", {trigger: true});
      return false;
    },

    addTroupeClicked: function () {
      var view = new SignupModalView( {existingUser: true} );
        var modal = new TroupeViews.Modal({ view: view });
        view.on('signup.complete', function(data) {
          modal.off('signup.complete');
        });

        modal.show();

        return false;
    },

    addOneTroupe: function(model) {
      this.troupeSelectorMenu.$el.append("<div class='trpTroupeSelectorItem'><a href='" + model.get("uri") + "'>"+ model.get("name") + "</a></div>");
    },

    addAllTroupes: function() {
      this.troupeSelectorMenu.$el.empty();
      this.troupeCollection.each(this.addOneTroupe, this);
      this.troupeSelectorMenu.$el.append("<div class='trpTroupeSelectorAdd add-troupe'>Start a new Troupe</div>");
    },

    showShareView: function() {
      var view = new ShareModalView({ model: this.model, uri: window.troupeContext.troupe.uri });
      var modal = new TroupeViews.Modal({ view: view  });

      view.on('share.complete', function(data) {
          modal.off('share.complete');
          modal.hide();
        });

      modal.show();

      return false;
    }

    /*,
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
    */

  });

  return AppView;
});
