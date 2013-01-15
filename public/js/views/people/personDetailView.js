// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'hbs!./personDetailView',
  './confirmRemoveModalView'
], function($, _, Backbone, TroupeViews, template, ConfirmRemoveModalView){
  return TroupeViews.Base.extend({
    template: template,
    buttonMenu : false,
    events: {
      "click #person-remove-button": "onRemoveClicked"
    },

    initialize: function(options) {
      this.setRerenderOnChange();
    },

    getRenderData: function () {
      var d = this.model.toJSON();
      // var latestVersion = this.model.get('versions').length - 1;
      // d.fileIcon = '/troupes/' + window.troupeContext.troupe.id + '/thumbnails/' + d.fileName + "?version=" + latestVersion;
      // d.previewUrl = '#file/preview/' + d.id;
      // d.versionsUrl = '#file/versions/' + d.id;

      console.dir("D: " + d);

      return d;
    },

    onRemoveClicked: function() {
      var that = this;
      var thisPerson = this;
      var view = new ConfirmRemoveModalView({ model: this.model });
      var modal = new TroupeViews.Modal({ view: view  });

      view.on('confirm.yes', function(data) {
          modal.off('confirm.yes');
          modal.hide();
           $.ajax({
              url: "/troupes/" + window.troupeContext.troupe.id + "/users/" + this.model.get('id'),
              data: "",
              type: "DELETE",
              success: function(data) {
                console.log("Removed this person");
                thisPerson.$el.toggle();
              }
            });
      });

      view.on('confirm.no', function(data) {
        modal.off('confirm.no');
        modal.hide();
       });

      modal.show();

      return false;
    }

  });
});
