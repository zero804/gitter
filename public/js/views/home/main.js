/*jshint unused:true browser:true*/
// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'hbs!templates/home/main',
  'views/login/loginRequestModalView'
], function($, _, Backbone, TroupeViews, template, RequestModalView) {
  "use strict";
  
  var MainHomeView = Backbone.View.extend({
    events: {
      "click .share":          "shareClicked",
      "click .request": "requestClicked"
    },

    requestClicked: function() {
      var view = new RequestModalView({ });
      var modal = new TroupeViews.Modal({ view: view  });
      modal.show();
      return false;
    },

    initialize: function(options) {
      if(options && options.params) {
        this.initialTab = options.params.tab;
      }
    },
    
    render: function() {
      var compiledTemplate = template({ });
      $(this.el).html(compiledTemplate);
      return this;
    },
    
    shareClicked: function() {
      window.troupeApp.showShareDialog();
    }
    
  });

  return MainHomeView;
});
