// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'hbs!templates/mail/item'
], function($, _, Backbone, template) {
  var FullMailView = Backbone.View.extend({
    events: {
      "click .link-version": "switchLinkToVersions"
    },

    linkToLatestVersion: false,
    
    initialize: function(options) {
      _.bindAll(this, "switchLinkToVersions");
      this.router = options.router;
      this.id = options.params;
      this.load();
    },

    switchLinkToVersions: function() {
      this.linkToLatestVersion = !this.linkToLatestVersion;
      this.generateAttachmentMenu();
      return false;
    },

    load: function() {
      var self = this;
      $.ajax({
        url: "/troupes/" + window.troupeContext.troupe.id + "/mails/" + this.id,
        dataType: "json",
        type: "GET",
        success: function(data) {
          self.mail = data;
          self.renderMailItem();
        }
      });

    },
    
    render: function() {
      var compiledTemplate = template({});
      $(this.el).html(compiledTemplate);
      return this;
    },
    
    renderMailItem: function() {
      $('.label-subject',this.el).text(this.mail.subject);
      $('.label-body',this.el).html(this.mail.mail);

      this.generateAttachmentMenu();
    },

    generateAttachmentMenu: function() {
      var menu = $('#attachments-menu',this.el);
      $('.link-attachment', menu).remove();

      var self = this;
      _.each(this.mail.attachments, function(item) {
        var li = $('<li class="link-attachment"></li>');
        var a = $('<a>');

        if(self.linkToLatestVersion) {
          a.attr('href', item.file.url);
        } else {
          a.attr('href', item.file.url + "?version=" + item.version);
        }
        a.attr('target', "_new");
        a.text(item.file.fileName);
        li.append(a);

        if(self.linkToLatestVersion) {
          a.text(item.file.fileName);
        } else {
          a.text(item.file.fileName + " (v" + item.version + ")");
        }

        li.append(a);

        menu.prepend(li);
      });

      $('.link-version', this.$el).text(this.linkToLatestVersion ? "Link to embedded versions" : "Link to latest versions");
    }
    
  });

  return FullMailView;
});
