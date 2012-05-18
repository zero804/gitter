define([
       'underscore',
       'backbone',
       'text!templates/files.html'
], function(_, Backbone, tmpl){

  var fileView = Backbone.View.extend({
    el: '#files',
    template: _.template(tmpl),

    render: function() {
      $(this.el).html(this.template());
      return this;
    }

  });

  return fileView;

});
