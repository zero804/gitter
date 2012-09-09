// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'hbs!./fileVersionsView',
  './versionView'
], function($, _, Backbone, TroupeViews, template, VersionView){
  return TroupeViews.Base.extend({
    template: template,

    events: {
    },

    initialize: function(options) {
    },

    afterRender: function() {
      new TroupeViews.Collection({
         collection: this.model.get('versions'),
         itemView: VersionView,
         el: this.$el.find('.frame-versions')
      }).render();
    },

    getRenderData: function () {
      var d = this.model.toJSON();
      d.fileIcon = '/troupes/' + window.troupeContext.troupe.id + '/thumbnails/' + d.fileName;
      return d;
    }

  });
});
