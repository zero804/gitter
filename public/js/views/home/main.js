// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'hbs!templates/home/main',
  'views/login/loginRequestModalView',
  'views/login/loginRequestConfirmModalView'
], function($, _, Backbone, TroupeViews, template, RequestModalView, RequestConfirmModalView){
  var MainHomeView = Backbone.View.extend({
    events: {
      "click .share":          "shareClicked",
      "click .request": "requestClicked"
    },

    requestClicked: function() {
      var view = new RequestModalView({ model: this.model });
      var modal = new TroupeViews.Modal({ view: view  });
      view.on('request.complete', function() {
          modal.off('request.complete');
          modal.transitionTo(new TroupeViews.Modal({ view: new RequestConfirmModalView({ }) }));
        });
      modal.show();

      return false;
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
