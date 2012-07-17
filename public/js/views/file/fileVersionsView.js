// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'hbs!./fileVersionsView'
], function($, _, Backbone, TroupeViews, template){
  return TroupeViews.Base.extend({
    template: template,

    events: {
      //"click .link-versions":  "onVersionsLinkClick"
    },

    initialize: function(options) {
      //_.bindAll(this, 'onPreviewLinkClick', 'showFileActionMenu', 'hideFileActionMenu', 'onDeleteLinkClick', 'onVersionsLinkClick');
      console.dir(this.model);
    }

  });
});
