define([
       'underscore',
       'backbone',
       'text!templates/chat.html'
], function(_, Backbone, tmpl){

  var chatView = Backbone.View.extend({
    el: '#chat',
    template: _.template(tmpl),

    render: function() {
      $(this.el).html(this.template());
      return this;
    }

  });

  return chatView;

});
