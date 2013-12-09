/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */

define([
  'collections/instances/troupes',
  'jquery',
  'backbone',
  'hbs!./tmpl/headerViewTemplate',
  'twitter-text'
], function(troupesCollection, $, Backbone, headerViewTemplate, TwitterText)  {
  "use strict";

  var troupes = troupesCollection.troupes;
  window.troupes = troupes;

  var HeaderView = Backbone.View.extend({
    el: 'header',

    initialize: function() {
      this.listenTo(this.model, "change", this.render);
    },

    render: function() {
      var room = this.model.toJSON();
      if (room.topic) {
        var safeTopic = TwitterText.txt.htmlEscape(room.topic);
        var entities = TwitterText.txt.extractUrlsWithIndices(safeTopic, {extractUrlsWithoutProtocol: true});
        room.topic = TwitterText.txt.autoLinkEntities(safeTopic, entities, {targetBlank: true});
      }
      var compiledTemplate = headerViewTemplate({troupe: room});
      $(this.el).html(compiledTemplate);
      return this;
    }
  });

  return HeaderView;

});
