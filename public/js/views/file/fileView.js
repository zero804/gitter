// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'mustache',
  'text!templates/file/file.mustache',
  'text!templates/file/row.mustache',
  'fileUploader',
  'collections/files'
], function($, _, Backbone, Mustache, template, rowTemplate, fileUploaderStub, FileCollection){
  var FileView = Backbone.View.extend({
    collection: new FileCollection(),
    initialize: function(options) {
      this.router = options.router;

      _.bindAll(this, 'onCollectionAdd', 'onCollectionReset', 'onFileEvent')

      this.collection.bind('add', this.onCollectionAdd);
      this.collection.bind('reset', this.onCollectionReset);

      $(document).on('file', this.onFileEvent);
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
        console.dir(item);
        var rowHtml = Mustache.render(rowTemplate, {
          fileName: item.get('fileName'),
          url: item.get('url'),
          mimeType: item.get('mimeType'),
          fileIcon: this.fileIcon(item.get('fileName'))
        });

        var el = $(rowHtml);
        $(".frame-files", this.el).append(el);
        el.on('click', this.onClickGenerator(item));
    },

    events: {

    },

    fileIcon: function(fileName) {
      return '/troupes/' + window.troupeContext.troupe.id + '/thumbnails/' + fileName;
    },

    render: function() {
      var compiledTemplate = Mustache.render(template, { });
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
    },

    renderFiles: function(files) {
      if (files.length === 0) $("#frame-help").show();
      $(".frame-files", this.el).empty();
      while(files.length > 0) {
        var p1 = files.shift();

        var rowHtml = Mustache.render(rowTemplate, {
          fileName: p1.fileName,
          url: p1.url,
          mimeType: p1.mimeType,  // I think the mimeType may actually be useless, eg. I got this for a PPT I attached in Mac Mail (application/vnd.openxmlformats-officedocument.presentationml.presentation)
          fileIcon: this.fileIcon(p1.fileName)
        });

        var item = $(rowHtml);
        $(".frame-files", this.el).append(item);
        item.on('click', this.onClickGenerator(p1.url));
      }
    }

  });

  return FileView;
});
