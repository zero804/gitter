/*jshint unused:true browser:true*/

define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'hbs!./tmpl/fileDetailView'
], function($, _, Backbone, TroupeViews, template) {
  return TroupeViews.Base.extend({
    unreadItemType: 'file',
    template: template,
    buttonMenu : false,
    events: {
      "click .link-delete":   "onDeleteLinkClick"
    },

    initialize: function(/*options*/) {
      this.setRerenderOnChange();
    },

    getRenderData: function () {
      var d = this.model.toJSON();
      var latestVersionNumber = this.model.get('versions').length - 1;
      d.fileIcon = '/troupes/' + window.troupeContext.troupe.id + '/thumbnails/' + d.fileName + "?version=" + latestVersionNumber;
      d.previewUrl = '#file/preview/' + d.id;
      d.versionsUrl = '#file/versions/' + d.id;
      d.useSpinner = this.model.get('versions').at(latestVersionNumber).get('thumbnailStatus') === 'GENERATING';

      return d;
    },

    onDeleteLinkClick: function() {
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
