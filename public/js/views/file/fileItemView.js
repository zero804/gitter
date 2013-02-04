/*jshint unused:true browser:true*/
define([
  'jquery',
  'underscore',
  'backbone',
  'marionette',
  'views/base',
  'hbs!./tmpl/fileItemView'
], function($, _, Backbone, Marionette, TroupeViews, template) {
  /*jslint browser: true*/
  "use strict";

  return TroupeViews.Base.extend({
    unreadItemType: 'file',
    tagName: 'span',
    template: template,
    initialize: function() {
      this.setRerenderOnChange();
    },

    getRenderData: function(){
      var data = this.model.toJSON();

      var versions = this.model.get('versions');

      var latestVersion = versions.length;
      data.fileIcon = this.fileIcon(this.model.get('fileName'), latestVersion);
      data.useSpinner = versions.at(versions.length - 1).get('thumbnailStatus') === 'GENERATING';

      return data;
    },

    render: function() {
      var r = TroupeViews.Base.prototype.render.call(this);

      var firstChild = this.$el.find(':first-child');
      // tooltips aren't loaded on mobile, they don't work
      if (firstChild.tooltip) {
        firstChild.tooltip({
          html : true,
          placement : "right"
        });
      }

      return r;
    },

    fileIcon: function(fileName, version) {
      return '/troupes/' + window.troupeContext.troupe.id + '/thumbnails/' + fileName + "?version=" + version;
    }
  });

});
