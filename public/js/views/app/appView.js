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
  'noty',
  'components/unread-items-client',
  'slider',
  'retina',
  'animateEnhanced'
], function($, _, Backbone, troupeModels, notificationModels, TroupeViews, SignupModalView, ShareModalView, NavView, notyStub, unreadItemsClient, SliderView, RetinaDisplay) {
  "use strict";

  var AppView = TroupeViews.Base.extend({
    el: 'body',

    events: {
        "click .menu-profile": "profileMenuClicked",
        "click .menu-settings": "settingsMenuClicked",
        "click .menu-signout": "signoutMenuClicked",
        "click .troupe-selector"  : "toggleSelector",
        "click .add-troupe" : "addTroupeClicked",
        "click .menu-add-troupe" : "addTroupeClicked",
        "click .menu-add-person" : "showShareView",
        "click #install-chrome-extension" : "installChromeExtensionClicked",
        "click .trpNavItemText" : "resetMenu"
         //"click #trpPersonIcon" : "toggleUserMenu"
    },

    initialize: function(options) {
      // if (this.compactView) new SlidingView( 'sidebar', 'body' ); 
      var self = this;
      this.router = options.router;

      _.bindAll(this, 'profileMenuClicked', 'settingsMenuClicked', 'signoutMenuClicked', 'toggleSelector', 'addTroupeClicked');



      function attachNavView(selector, itemType) {
        var v;
        if(itemType == 'people') {
          v = unreadItemsClient.getValue('request');
        } else {
          v = unreadItemsClient.getValue(itemType);
        }

        var e = self.$el.find(selector);

        var navItems = self.$el.find(".trpNavNotification");
        navItems.css({"visibility":"visible"});

        return new NavView({ el: e, initialUnreadCount: v }).render();
      }

      this.nav = {
        'chat': attachNavView('#nav-chat', 'chat'),
        'mail': attachNavView('#nav-mail', 'mail'),
        'file': attachNavView('#nav-files', 'file'),
        'people': attachNavView('#nav-people', 'people')
      };

      $.ajax({
        url: "/troupes/" + window.troupeContext.troupe.id + "/users",
        dataType: "json",
        type: "GET",
        success: function(data) {
          var members = data.length; 
          $.ajax({
            url: "/troupes/" + window.troupeContext.troupe.id + "/invites",
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

      if (!this.compactView) this.troupeSelectorMenu = new TroupeViews.Menu({ el: "#troupe-selector", triggerEl: "#menu-notification-selector" });

      this.userMenu = new TroupeViews.Menu({ el: "#troupe-user-menu", triggerEl: "#person-icon" });
      this.addPersonMenu = new TroupeViews.Menu({ el: "#troupe-add-menu", triggerEl: "#add-icon" });
      this.notifyMenu = new TroupeViews.Menu({ el: "#troupe-notify-menu", triggerEl: "#notify-icon" });
      this.settingsMenu = new TroupeViews.Menu({ el: "#troupe-settings-menu", triggerEl: "#settings-icon" });

      if (!this.compactView) {
        this.troupeCollection.on('change', this.addAllTroupes, this);
        this.troupeCollection.on('add', this.addOneTroupe, this);
        this.troupeCollection.on('refresh', this.addAllTroupes, this);
      
        this.troupeCollection.fetch({
          success: function() { self.addAllTroupes(); }
        });
      }

      $(document).on('itemUnreadCountChanged', function(event, data) {
        var itemType = data.itemType;
        var v = self.nav[itemType == 'request' ? 'people' : itemType];
        if(v) {
          var value = unreadItemsClient.getValue(itemType);
          v.updateNotificationValue(value);
        }
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

    installChromeExtensionClicked: function() {
      console.log("Install Chrome extension clicked");
      require(['views/modals/installChromeExtensionModalView'], function(InstallChromeExtensionsModalView) {
        var view = new InstallChromeExtensionsModalView({ });
        var modal = new TroupeViews.Modal({ view: view });

        view.on('install.complete', function(data) {
          modal.off('install.complete');
          modal.hide();
        });

        view.on('install.cancel', function(data) {
          modal.off('install.cancel');
          modal.hide();
        });

        modal.show();
      });
    },

    resetMenu: function(){
      console.log("Reset Menu");
      if (this.compactView) {
        console.log("Compact:" + this.compactView);
        $('#body').animate({
          left: -0
        }, 200, 'swing', function () {

         }
        );
      }
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
