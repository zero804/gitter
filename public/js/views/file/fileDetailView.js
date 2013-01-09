// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'hbs!./fileDetailView',
  './versionView'
], function($, _, Backbone, TroupeViews, template, VersionView){
  return TroupeViews.Base.extend({
    template: template,
    buttonMenu : false,
    events: {
      "click .link-delete":   "onDeleteLinkClick"
    },

    initialize: function(options) {
    },

    getRenderData: function () {
      var d = this.model.toJSON();
      var latestVersion = this.model.get('versions').length - 1;
      d.fileIcon = '/troupes/' + window.troupeContext.troupe.id + '/thumbnails/' + d.fileName + "?version=" + latestVersion;
      d.previewUrl = '#file/preview/' + d.id;
      d.versionsUrl = '#file/versions/' + d.id;

      return d;
    },

    onDeleteLinkClick: function(e) {
      //TODO(AN): replace window.confirm with a nice dialog!
      if(window.confirm("Delete " + this.model.get('fileName') + "?")) {
        this.model.destroy({
          success: function(model, response) {
          }
        });
      }
    }

  });
});
