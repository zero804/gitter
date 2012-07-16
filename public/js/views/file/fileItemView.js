// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'hbs!./fileItemView',
  './filePreviewView'
], function($, _, Backbone, TroupeViews, template, FilePreviewView){
  return TroupeViews.Base.extend({
    template: template,

    events: {
      "click .trpFileActionMenuButton": "showFileActionMenu",
      "click .link-preview": "onPreviewLinkClick",
      "click .link-delete":  "onDeleteLinkClick"
    },

    initialize: function(options) {
      _.bindAll(this, 'onPreviewLinkClick', 'showFileActionMenu', 'hideFileActionMenu', 'onDeleteLinkClick');
    },

    onPreviewLinkClick: function(e) {
      var view = new FilePreviewView({ model: this.model });
      var modal = new TroupeViews.Modal({ view: view  });
      modal.show();

      return false;
    },

    onDeleteLinkClick: function(e) {
      //TODO(AN): replace window.confirm with a nice dialog!
      if(window.confirm("Delete " + this.model.get('fileName') + "?")) {
        this.model.destroy({
          success: function(model, response) {
          }
        });
      }

      return false;
    },

    getRenderData: function() {
      var data = this.model.toJSON();
      data.fileIcon = this.fileIcon(this.model.get('fileName'));
      return data;
    },

    showFileActionMenu: function(e) {
      $('body, html').on('click', this.hideFileActionMenu);

      this.$el.find(".trpFileActionMenu").show();
      this.$el.find(".trpFileActionMenuTop").show();
      this.$el.find('.trpFileActionMenuBottom').slideDown('fast', function() {
          // Animation complete.
      });
      return false;
    },

    hideFileActionMenu: function(e) {
      var self = this;
      $('body, html').off('click', this.hideFileActionMenu);

      this.$el.find(".trpFileActionMenuTop").hide();
      this.$el.find('.trpFileActionMenuBottom').slideUp('fast', function() {
        self.$el.find(".trpFileActionMenu").hide();
      });
    },

    fileIcon: function(fileName) {
      return '/troupes/' + window.troupeContext.troupe.id + '/thumbnails/' + fileName;
    }
  });
});
