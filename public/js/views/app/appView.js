// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'collections/troupes'
], function($, _, Backbone, TroupeCollection) {
  
  var AppView = Backbone.View.extend({
    el: 'body',

    troupeCollection: new TroupeCollection(),

    troupeSelectorMenu: $("#menu-troupe-selector"),

    initialize: function() {
      console.log("Fetching troupe Collection");
      this.troupeCollection.on('change', this.addAllTroupes, this);

      this.troupeCollection.on('add', this.addOneTroupe, this);
      this.troupeCollection.on('refresh', this.addAllTroupes, this);

      var self = this;
      this.troupeCollection.fetch({
        success: function() { self.addAllTroupes(); }
      });
    },
    
    events: {
      //"keydown .chatbox":          "detectReturn"
    },


    addOneTroupe: function(model) {
      console.log("Add One");
      this.troupeSelectorMenu.append("<li><a href='" + model.get("uri") + "'>"+ model.get("name") + "</a></li>");
    },

    addAllTroupes: function() {
      console.log("Add All");
      this.troupeSelectorMenu.empty();
      this.troupeCollection.each(this.addOneTroupe, this);
    }

  });

  return AppView;
});
