/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'utils/context',
  'marionette',
  'hbs!./tmpl/headerViewTemplate',
  'twitter-text'
], function(context, Marionette, headerViewTemplate, TwitterText)  {
  "use strict";

  return Marionette.ItemView.extend({
    template: headerViewTemplate,
    modelEvents: {
        'change': 'render'
    },
    serializeData: function() {
      var troupe = this.model.toJSON();
      var topic = troupe.topic;
      if (topic) {
        var safeTopic = TwitterText.txt.htmlEscape(topic);
        var entities = TwitterText.txt.extractUrlsWithIndices(safeTopic, {extractUrlsWithoutProtocol: true});
        topic = TwitterText.txt.autoLinkEntities(safeTopic, entities, {targetBlank: true});
      }

      return {
        permissions: context().permissions,
        troupe: troupe,
        topic: topic
      };
    }
  });

});
