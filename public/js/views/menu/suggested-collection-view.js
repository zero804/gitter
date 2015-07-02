"use strict";
var roomNameTrimmer = require('utils/room-name-trimmer'); // TODO: move this to shared
var Marionette = require('backbone.marionette');
var template = require('./tmpl/suggested-list-item.hbs');
var troupeCollections = require('collections/instances/troupes');

/* How hillbillies manipulate urls */
function appendToUrl(url, params) {
  if (url.indexOf('?') >= 0) return params + "&" + params;
  return url + "?" + params;
}

/* This should be united with userhome/suggested-room-collection-view */

var SuggestedItemView = Marionette.ItemView.extend({
  tagName: 'li',
  className: 'room-list-item',
  template: template,
  modelEvents: {
    change: 'render',
  },
  serializeData: function() {
    var model = this.model;
    return {
      avatarUrl: appendToUrl(model.get('avatarUrl'), 's=30'),
      linkUrl: '/' + model.get('uri'),
      uri: roomNameTrimmer(model.get('uri'))
    };
  }
});

module.exports = Marionette.CollectionView.extend({
  tagName: 'ul',
  className: 'room-list',
  childView: SuggestedItemView,
  filter: function (child/*, index, collection*/) {
    /* Do not show any items that the user has joined */
    return !troupeCollections.troupes.get(child.id);
  }
});
