/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'utils/context',
  'marionette',
  'hbs!./tmpl/headerViewTemplate',
  'utils/autolink',
  'underscore',
  'components/notifications'
], function($, context, Marionette, headerViewTemplate, autolink, _, notifications)  {
  "use strict";

  return Marionette.ItemView.extend({
    template: headerViewTemplate,
    modelEvents: {
        'change': 'render'
    },
    events: {
      'click #leave-room': 'leaveRoom',
      'click #notifications-settings-link': 'enableBrowserNotifications'
    },

    leaveRoom: function() {
      $.ajax({
        url: "/api/v1/troupes/" + context.getTroupeId() + "/users/" + context.getUserId(),
        data: "",
        type: "DELETE",
      });
    },

    enableBrowserNotifications: function() {
      if(context().desktopNotifications) {
        notifications.enable();
      }
    },

    serializeData: function() {
      var troupe = this.model.toJSON();
      var topic = troupe.topic;
      if (topic) {
        var safeTopic = _.escape(topic);
        topic = autolink(safeTopic);
      }

      return {
        permissions: context().permissions,
        oneToOne: troupe.oneToOne,
        troupeName: troupe.name,
        troupeTopic: topic,
        troupeUri : troupe.url,
        troupeFavourite: troupe.favourite
      };
    }
  });

});
