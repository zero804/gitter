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

    events: {
    },

    initialize: function(options) {
    },

    getRenderData: function () {
      var d = this.model.toJSON();
      var latestVersion = this.model.get('versions').length - 1;
      d.fileIcon = '/troupes/' + window.troupeContext.troupe.id + '/thumbnails/' + d.fileName + "?version=" + latestVersion;
      d.previewUrl = '#file/preview/' + d.id;
      return d;
    }

  });
});
