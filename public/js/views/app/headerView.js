/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'utils/context',
  'marionette',
  'hbs!./tmpl/headerViewTemplate',
  'twitter-text'
], function($, context, Marionette, headerViewTemplate, TwitterText)  {
  "use strict";

  return Marionette.ItemView.extend({
    template: headerViewTemplate,
    modelEvents: {
        'change': 'render'
    },
    events: {
      'click #leave-room': 'leaveRoom',
    },

    leaveRoom: function() {
      $.ajax({
        url: "/api/v1/troupes/" + context.getTroupeId() + "/users/" + context.getUserId(),
        data: "",
        type: "DELETE",
      });
    },

    serializeData: function() {
      var troupe = this.model.toJSON();
      console.dir(troupe);
      var topic = troupe.topic;
      if (topic) {
        var safeTopic = TwitterText.txt.htmlEscape(topic);
        var entities = TwitterText.txt.extractUrlsWithIndices(safeTopic, {extractUrlsWithoutProtocol: true});
        topic = TwitterText.txt.autoLinkEntities(safeTopic, entities, {targetBlank: true});
      }

      return {
        permissions: context().permissions,
        oneToOne: troupe.oneToOne,
        troupeName: troupe.name,
        troupeTopic: topic,
        troupeFavourite: troupe.favourite
      };
    }
  });

});
