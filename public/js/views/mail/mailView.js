// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'mustache',
  'text!templates/mail/mail.mustache'
], function($, _, Backbone, Mustache, template){
  var MailView = Backbone.View.extend({    
    render: function() {
      var compiledTemplate = Mustache.render(template, { });
      $(this.el).html(compiledTemplate);
      return this;
    }
    
  });

  return MailView;
});
