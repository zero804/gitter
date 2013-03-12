/*jshint unused:true, browser:true */

define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'marionette',
  'hbs!./tmpl/fileVersionsView',
  './versionView'
], function($, _, Backbone, TroupeViews, Marionette, template, VersionView){
  var View = TroupeViews.Base.extend({
    template: template,

    events: {
    },

    initialize: function(options) {
    },

    afterRender: function() {
      new Marionette.CollectionView({
         collection: this.model.get('versions'),
         itemViewOptions: { file: this.model },
         itemView: VersionView,
         el: this.$el.find('.frame-versions')
      }).render();
    },

    getRenderData: function () {
      var d = this.model.toJSON();
      d.fileIcon = this.model.get('thumbnailUrl');
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
