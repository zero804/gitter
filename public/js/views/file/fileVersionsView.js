// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'hbs!./fileVersionsView',
  './versionView'
], function($, _, Backbone, TroupeViews, template, VersionView){
  var View = TroupeViews.Base.extend({
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
      var latestVersion = this.model.get('versions').length - 1;
      d.fileIcon = '/troupes/' + window.troupeContext.troupe.id + '/thumbnails/' + d.fileName + "?version=" + latestVersion;
      return d;
    }

  });


  var Modal = TroupeViews.Modal.extend({
    initialize: function(options) {
      TroupeViews.Modal.prototype.initialize.apply(this, arguments);
      this.view = new View({ model: this.model });
    }
  });

  return {
    View: View,
    Modal: Modal
  }
});
