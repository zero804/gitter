// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'mustache',
  'text!templates/file/file.mustache',
  'text!templates/file/row.mustache'
], function($, _, Backbone, Mustache, template, rowTemplate){
  var FileView = Backbone.View.extend({    
    
    initialize: function(options) {
      this.router = options.router;
      var self = this;
      $.ajax({
        url: "/troupes/" + window.troupeContext.troupe.id + "/files",
        contentType: "application/json",
        dataType: "json",
        type: "GET",
        success: function(data) {
          self.renderFiles(data);
        }
      });
    },
    
    events: {

    },

    fileIcon: function(fileName){
      var icon = "unknown.png";
      var ext = fileName.substring(fileName.lastIndexOf(".")+1,fileName.length).toLowerCase();
      switch(ext){
        case "jpg": case "jpeg":
          icon = "jpg.png";
          break;
        case "png":
          icon = "png.png";
          break;
        case "pdf":
          icon = "pdf.png";
          break;
        case "ppt": case "pptx":
          icon = "ppt.png";
          break;
        case "xls": case "xlsx":
          icon = "xls.png";
          break;
        case "doc": case "docx":
          icon = "doc.png";
          break;
        case "mov":
          icon = "mov.png";
          break;
        case "gif":
          icon = "gif.png";
          break;
      }

      return icon;
    },
    
    render: function() {
      var compiledTemplate = Mustache.render(template, { });
      $(this.el).html(compiledTemplate);
      return this;
    },
    
    renderFiles: function(files) {
      $(".frame-files", this.el).empty();
      while(files.length > 0) {
        var p1 = files.shift();

        var rowHtml = Mustache.render(rowTemplate, {
          fileName: p1.fileName,
          mimeType: p1.mimeType,  // I think the mimeType may actually be useless, eg. I got this for a PPT I attached in Mac Mail (application/vnd.openxmlformats-officedocument.presentationml.presentation)
          fileIcon: this.fileIcon(p1.fileName)
        });
        
        var item = $(rowHtml);
        $(".frame-files", this.el).append(item);
      }
    }
    
  });

  return FileView;
});
