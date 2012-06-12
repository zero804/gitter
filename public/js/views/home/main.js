// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'mustache',
  'text!templates/home/main.mustache'
], function($, _, Backbone, Mustache, template){
  var MainHomeView = Backbone.View.extend({    
    events: {
      "click .share":          "shareClicked"
    },

    initialize: function(options) {
      if(options && options.params) {
        this.initialTab = options.params.tab;
      }

      var self = this;
      $.ajax({
        url: "/troupes/" + window.troupeContext.troupe.id + "/users",
        contentType: "application/json",
        dataType: "json",
        type: "GET",
        success: function(data) {
          var members = data.length;
          //if (members==1) window.troupeApp.showShareDialog();
        }
      });
    },
    
    render: function() {
      var compiledTemplate = Mustache.render(template, { });
      $(this.el).html(compiledTemplate);
      return this;
    },
    
    shareClicked: function() {
      window.troupeApp.showShareDialog();
    }
    
  });

  return MainHomeView;
});
