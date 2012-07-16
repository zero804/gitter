// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'hbs!./fileItemView'
], function($, _, Backbone, TroupeViews, template){
  var FileView = TroupeViews.Base.extend({
    template: template,

    events: {
      "click .trpFileActionMenuButton": "showFileActionMenu",
      "click .link-preview" : "onPreviewLinkClick"
    },

    initialize: function(options) {
      _.bindAll(this, 'onPreviewLinkClick', 'showFileActionMenu', 'hideFileActionMenu');
    },

    onPreviewLinkClick: function(event) {
      var item = this.model;

      console.log("onPreviewLinkClick");

      function getPreviewOptions() {
        var previewMimeType = item.get('previewMimeType');
        var mimeType = item.get('previewMimeType');

        if(/^image\//.test(previewMimeType)) {
          return {
            href: item.get('embeddedUrl') + '?embedded=1',
            photo: true
          };
        }

        if(previewMimeType == 'application/pdf') {
          return {
            href: '/pdfjs/web/viewer.html?file=' + item.get('embeddedUrl'),
            iframe: true,
            width: "80%",
            height: "80%"
          };
        }

        if(/^image\//.test(mimeType)) {
          return {
            href: item.get('url') + '?embedded=1',
            photo: true
          };
        }

        if(mimeType == 'application/pdf') {
          return {
            width: "80%",
            height: "80%",
            href:  '/pdfjs/web/viewer.html?file=' + item.get('url') + "?embedded=1",
            iframe: true
          };
        }
      }

      var previewOptions = getPreviewOptions(item);
      if(previewOptions) {
        previewOptions.title = item.get('fileName');
        $.colorbox(previewOptions);
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
      $('body, html').off('click', this.hideFileActionMenu);

      this.$el.find(".trpFileActionMenuTop").hide();
      this.$el.find('.trpFileActionMenuBottom').slideUp('fast', function() {
        this.$el.find(".trpFileActionMenu").hide();
      });
    },

    fileIcon: function(fileName) {
      return '/troupes/' + window.troupeContext.troupe.id + '/thumbnails/' + fileName;
    },

    onClickGenerator: function(file) {
      var self = this;
      return function() {
        //window.open(file.get('embeddedUrl'));
        window.open(file.get('url'));
      };
    }
  });

  return FileView;
});
