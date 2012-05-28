// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'collections/troupes',
  'noty'
], function($, _, Backbone, TroupeCollection, notyStub) {

  var AppView = Backbone.View.extend({
    el: 'body',

    troupeCollection: new TroupeCollection(),

    troupeSelectorMenu: $("#trpTroupeSelector"),

    initialize: function() {
      this.troupeCollection.on('change', this.addAllTroupes, this);

      this.troupeCollection.on('add', this.addOneTroupe, this);
      this.troupeCollection.on('refresh', this.addAllTroupes, this);

      var self = this;
      this.troupeCollection.fetch({
        success: function() { self.addAllTroupes(); }
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

    },

    events: {
         "click #trpSelectorArrow"  : "toggleSelector",
         "click #trpPersonIcon" : "toggleUserMenu"
    },

    toggleSelector: function(){
      if ($('#trpTroupeSelector').height() === 0) $('#trpTroupeSelector').animate({
        height: '900px'
      }, 500);
      else $('#trpTroupeSelector').animate({
        height: '0px'
      }, 300);
    },

    toggleUserMenu: function() {
      if ($('#trpUserMenu').height() === 0) $('#trpUserMenu').animate({
        height: '200px'
      }, 500);
      else $('#trpUserMenu').animate({
        height: '0px'
      }, 300);

    },


    addOneTroupe: function(model) {
      this.troupeSelectorMenu.append("<div class='trpTroupeSelectorItem'><h1><a href='" + model.get("uri") + "'>"+ model.get("name") + "</a></h1></div>");
    },

    addAllTroupes: function() {
      this.troupeSelectorMenu.empty();
      this.troupeCollection.each(this.addOneTroupe, this);
    }

  });

  return AppView;
});
