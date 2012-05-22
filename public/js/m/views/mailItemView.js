define([
       'underscore',
       'backbone',
       'mustache',
       'text!templates/mail/item.mustache'
], function(_, Backbone){

  var MailView = Backbone.View.extend({
    el: '#mailitem',

    initialize: function(options) {
      this.router = options.router;
      var self = this;
      $.ajax({
        url: "/troupes/" + window.troupeContext.troupe.id + "/mails/" + this.id,
        contentType: "application/json",
        dataType: "json",
        type: "GET",
        success: function(data) {
          self.mail = data;
          self.renderMailItem();
        }
      });
    },

    renderMailItem: function() {
      $('.label-subject',this.el).text(this.mail.subject);
      $('.label-body',this.el).html(this.mail.mail);

      this.generateAttachmentMenu();
    },

    render: function() {
      return this;
    },

    close: function() {
      console.log("close miview");
      this.off();
    }

  });

  return MailView;

});
