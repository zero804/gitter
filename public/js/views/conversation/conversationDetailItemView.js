// Filename: views/home/main

// TODO: Better way to show the subject here, right now it will be set multiple times as this is called per conversationDetailItemView

define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'dateFormat',
  'hbs!views/conversation/conversationDetailItemView',
  'hbs!views/conversation/conversationDetailItemViewBody',
  'views/widgets/avatar'

], function($, _, Backbone, TroupeViews, dateFormat, template, bodyTemplate, AvatarView) {
  return TroupeViews.Base.extend({
    template: template,

    events: {
      "click .clickPoint-showEmail": "onHeaderClick",
    },

    attributes: {
      'class': 'trpMailRowContainer'
    },

    initialize: function(options) {
    },

    getRenderData: function() {
      var data = this.model.toJSON();
      data.personName = data.from.displayName;
      data.avatarUrl = data.from.avatarUrl;

      data.date = Date.parse(data.date);
      var d = new Date(data.date);
      data.date = d.toUTCString();
      var now = new Date();
      if (now.getDate() === d.getDate() && now.getMonth() === d.getMonth() && now.getFullYear() === d.getFullYear()) {
        data.date = d.format('h:MM TT');
      }
      else {
        data.date = d.format('mmm d');
      }

      // This is the bit that could be done better, probably better done in conversationDetailView
      $("#subject").html(data.subject);

      return data;
    },

    onHeaderClick: function(event) {
      if(this.mailbody) {
        $(this.mailbody).toggle();
        // For some reason using toggle (which adjusts css display property) causes other issues, so this just toggles visibility
        if(this.$el.find('.trpMailPreview').css("visibility") == 'hidden') {
          this.$el.find('.trpMailPreview').css("visibility","visible");
          return false;
        }
        this.$el.find('.trpMailPreview').css("visibility","hidden");
        return false;
      }

      var data = this.getRenderData();

      data.mail = data.mail.replace(/\t/g, '    ')
       .replace(/  /g, '&nbsp; ')
       .replace(/  /g, ' &nbsp;') // handles "W&nbsp;  W"
       .replace(/\r\n|\n|\r/g, '<br />');

      this.mailbody = $(bodyTemplate(data));
      this.$el.append(this.mailbody);
      this.$el.find('.trpMailPreview').css("visibility","hidden");

      return false;

    }

  });
});
