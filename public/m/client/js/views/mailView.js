define([
       'underscore',
       'backbone',
       'text!templates/mail.html'
], function(_, Backbone, tmpl){

  var mailView = Backbone.View.extend({
    el: '#mails',
    template: _.template(tmpl),

    render: function() {
      $(this.el).html(this.template());
      return this;
    }

  });

  return mailView;

});
