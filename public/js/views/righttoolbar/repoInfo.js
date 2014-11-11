"use strict";

var $ = require('jquery');
var Backbone = require('backbone');
var repoInfoTemplate = require('./tmpl/repoInfo.hbs');

module.exports = (function() {


  var RepoInfoModel = Backbone.Model.extend({
    url: '/v1/repo-info'
  });

  var RepoInfoView = Backbone.View.extend({
    initialize: function() {
      this.listenTo(this.model, "change", this.render);
    },
    render: function() {
      var compiledTemplate = repoInfoTemplate(this.model.toJSON());
      $(this.el).html(compiledTemplate);
      return this;
    }
  });

  return {
    model:  RepoInfoModel,
    view:   RepoInfoView
  };

})();

