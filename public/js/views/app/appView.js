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

    troupeSelectorMenu: $("#menu-troupe-selector"),

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
      //"keydown .chatbox":          "detectReturn"
    },


    addOneTroupe: function(model) {
      this.troupeSelectorMenu.append("<li><a href='" + model.get("uri") + "'>"+ model.get("name") + "</a></li>");
    },

    addAllTroupes: function() {
      this.troupeSelectorMenu.empty();
      this.troupeCollection.each(this.addOneTroupe, this);
    }

  });

  return AppView;
});
