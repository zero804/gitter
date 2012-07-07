// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'hbs!templates/file/file',
  'hbs!templates/file/row',
  'fileUploader',
  'collections/files',
  'jquery_colorbox',
  'dropdown'
], function($, _, Backbone, template, rowTemplate, fileUploaderStub, FileCollection, cbStub, Dropdown){
  var FileView = Backbone.View.extend({
    initialize: function(options) {
      this.router = options.router;
      this.collection = new FileCollection();

      _.bindAll(this, 'onCollectionAdd', 'onCollectionReset', 'onFileEvent', 'onPreviewLinkClick', 'showFileActionMenu', 'hideFileActionMenu');

      this.collection.bind('add', this.onCollectionAdd);
      this.collection.bind('reset', this.onCollectionReset);

      $(document).on('file', this.onFileEvent);
    },

    onPreviewLinkClick: function(event) {
      function getPreviewOptions(item) {
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

      var row = $(event.target).closest('tr');
      var item = row.data('item');

      var previewOptions = getPreviewOptions(item);
      if(previewOptions) {
        previewOptions.title = item.get('fileName');
        $.colorbox(previewOptions);
      }

      //$('#previewModal').modal('show');
      //$('#previewFrame').attr('src', previewUrl);
      return false;
    },

    beforeClose: function() {
      $(document).unbind('file', this.onFileEvent);
    },

    onFileEvent: function(event, data) {
      this.collection.fetch();
    },

    onCollectionReset: function() {
      $(".frame-files", this.el).empty();
      this.collection.each(this.onCollectionAdd);
    },

    onCollectionAdd: function(item) {

      var f = item.get('fileName');

       if(f.length > 21) {
            f = f.substring(0,21)+"...";
        }

        var rowHtml = rowTemplate({
          fileName: f,
          url: item.get('url'),
          mimeType: item.get('mimeType'),
          fileIcon: this.fileIcon(item.get('fileName'))
        });

        var el = $(rowHtml);
        el.data("item", item);
        $(".frame-files", this.el).append(el);
        $('.link-preview', el).on('click', this.onPreviewLinkClick);
        //el.on('click', this.onClickGenerator(item));
    },

    events: {
      "click .trpFileActionMenuButton": "showFileActionMenu"
    },


    showFileActionMenu: function(e) {
      $(".trpFileActionMenu").show();
      return false;
    },

    hideFileActionMenu: function(e) {
      $(".trpFileActionMenu").hide();
    },

    fileIcon: function(fileName) {
      return '/troupes/' + window.troupeContext.troupe.id + '/thumbnails/' + fileName;
    },

    render: function() {
      $('body, html').on('click', this.hideFileActionMenu);
      var compiledTemplate = template({ });
      $(this.el).html(compiledTemplate);
      this.createUploader($('.fileuploader',this.el)[0]);

      this.collection.fetch();
      return this;
    },

    onClickGenerator: function(file) {
      var self = this;
      return function() {
        //window.open(file.get('embeddedUrl'));
        window.open(file.get('url'));
      };
    },

    createUploader: function(element) {
      var uploader = new qq.FileUploader({
        element: element,
        action: '/troupes/' + window.troupeContext.troupe.id + '/downloads/',
        debug: true,
        onComplete: function() {
        }
      });
    }

  });

  return FileView;
});
