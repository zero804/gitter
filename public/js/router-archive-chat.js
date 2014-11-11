"use strict";
var $ = require('jquery');
var Backbone = require('backbone');
var context = require('utils/context');
var ChatIntegratedView = require('views/app/chatIntegratedView');
var HeaderView = require('views/app/headerView');
var ArchiveNavigationView = require('views/archive/archive-navigation-view');
require('views/widgets/preload');
require('filtered-collection');
require('components/dozy');
require('template/helpers/all');
require('components/bug-reporting');

module.exports = (function() {


  $(document).on("click", "a", function(e) {
    if(this.href) {
      var href = $(this).attr('href');
      if(href.indexOf('#') === 0) {
        e.preventDefault();
        window.location = href;
      }
    }

    return true;
  });


  // When a user clicks an internal link, prevent it from opening in a new window
  $(document).on("click", "a.link", function(e) {
    var basePath = context.env('basePath');
    var href = e.target.getAttribute('href');
    if(!href || href.indexOf(basePath) !== 0) {
      return;
    }

    e.preventDefault();
    window.parent.location.href = href;
  });

  var appView = new ChatIntegratedView({ el: 'body' });

  new HeaderView({ model: context.troupe(), el: '#header' });

  var archiveContext = context().archive;

  new ArchiveNavigationView({
    el: '#archive-navigation',
    archiveDate: archiveContext.archiveDate,
    nextDate: archiveContext.nextDate,
    previousDate: archiveContext.previousDate
  }).render();

  var Router = Backbone.Router.extend({
    routes: {
      // TODO: get rid of the pipes
      "": "hideModal",
    },

    hideModal: function() {
      appView.dialogRegion.close();
    },

  });

  new Router();

  Backbone.history.start();

})();

