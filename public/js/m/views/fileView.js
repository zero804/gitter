// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'hbs!templates/file/row',
  'collections/files'
], function($, _, Backbone, rowTemplate, FileCollection){
  var FileView = Backbone.View.extend({
    el: '#file',
    collection: new FileCollection(),
    initialize: function(options) {
      //this.router = options.router;

      _.bindAll(this, 'onCollectionAdd', 'onCollectionReset', 'onFileEvent');

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
      $("#filelist", this.el).empty();
      this.collection.each(this.onCollectionAdd);
    },

    onCollectionAdd: function(item) {
        console.dir(item);
        var rowHtml = rowTemplate( {
          fileName: item.get('fileName'),
          url: item.get('url'),
          mimeType: item.get('mimeType'),
          fileIcon: this.fileIcon(item.get('fileName'))
        });

        var el = $(rowHtml);
        $("#filelist", this.el).append(el);
        $('#filelist').listview('refresh');
    },

    events: {

    },

    fileIcon: function(fileName) {
      return '/troupes/' + window.troupeContext.troupe.id + '/thumbnails/' + fileName;
    },

    render: function() {
      this.collection.fetch();
      return this;
    },

    renderFiles: function(files) {
      //if (files.length === 0) $("#frame-help").show();
      alert('renderFiles');
      $("#filelist", this.el).empty();
      while(files.length > 0) {
        var p1 = files.shift();

        var rowHtml = rowTemplate({
          fileName: p1.fileName,
          url: p1.url,
          mimeType: p1.mimeType,  // I think the mimeType may actually be useless, eg. I got this for a PPT I attached in Mac Mail (application/vnd.openxmlformats-officedocument.presentationml.presentation)
          fileIcon: this.fileIcon(p1.fileName)
        });

        var item = $(rowHtml);
        $("#filelist", this.el).append(item);
      }
    }

  });

  return FileView;
});
