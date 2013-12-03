/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */

define([
  'jquery',
  'backbone',
  'hbs!./tmpl/repoInfo'
], function($, Backbone, repoInfoTemplate) {
  "use strict";

  var RepoInfoModel = Backbone.Model.extend({
    url: '/api/v1/repo-info'
  });

  var RepoInfoView = Backbone.View.extend({
    initialize: function() {
      this.listenTo(this.model, "change", this.render);
    },
    render: function() {
      window.repo = this.model;
      var compiledTemplate = repoInfoTemplate(this.model.toJSON());
      $(this.el).html(compiledTemplate);
      return this;
    }
  });

  return {
    model:  RepoInfoModel,
    view:   RepoInfoView
  };
});
