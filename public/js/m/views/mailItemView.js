define([
       'underscore',
       'backbone',
       'mustache'
], function(_, Backbone){

  var MailView = Backbone.View.extend({
    el: '#mailitem',

    initialize: function(options) {
      console.log('INIT, init');
      this.mailId = options.id;
      var self = this;

      $.ajax({
        url: "/troupes/" + window.troupeContext.troupe.id + "/mails/" + this.mailId,
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
      console.log('Rendering');
      $('.label-subject',this.el).text(this.mail.subject);
      $('.label-body',this.el).html(this.mail.mail);
      console.log('End Rendering');
      //this.generateAttachmentMenu();
    },

    render: function() {
      console.log("Render called");
      return this;
    },

    close: function() {
      console.log("close miview");
      this.off();
    }

  });

  return MailView;

});
