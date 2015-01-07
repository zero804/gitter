"use strict";
var $ = require('jquery');
var Backbone = require('backbone');
var context = require('utils/context');
var ChatNliIntegratedView = require('views/app/chatNliIntegratedView');
var itemCollections = require('collections/instances/integrated-items');
var RightToolbarView = require('views/righttoolbar/rightToolbarView');
var peopleCollectionView = require('views/people/peopleCollectionView');
var HeaderView = require('views/app/headerView');
var onready = require('./utils/onready');

require('views/widgets/preload');
require('filtered-collection');
require('components/dozy');
require('template/helpers/all');
require('components/bug-reporting');

// Preload widgets
require('views/widgets/avatar');
require('views/widgets/timeago');

onready(function() {

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

  var appView = new ChatNliIntegratedView({ el: 'body', chatCollection: itemCollections.chats, userCollection: itemCollections.users });

  new HeaderView({ model: context.troupe(), el: '#header' });
  new RightToolbarView({ el: "#right-toolbar-layout" });

  var Router = Backbone.Router.extend({
    routes: {
      // TODO: get rid of the pipes
      "": "hideModal",
      "people": "people",
    },

    hideModal: function() {
      appView.dialogRegion.close();
    },

    people: function() {
      appView.dialogRegion.show(new peopleCollectionView.Modal({ collection: itemCollections.sortedUsers }));
    },

  });

  new Router();

  // // Listen for changes to the room
  // liveContext.syncRoom();

  Backbone.history.start();

});
