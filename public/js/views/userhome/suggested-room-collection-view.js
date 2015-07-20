"use strict";

var Marionette = require('backbone.marionette');
var template = require('./tmpl/suggested-room-list-item.hbs');

/* How hillbillies manipulate urls */
function appendToUrl(url, params) {
  if (url.indexOf('?') >= 0) return params + "&" + params;
  return url + "?" + params;
}

var SuggestedRoomItemView = Marionette.ItemView.extend({
  tagName: 'li',
  className: 'suggested-room-list-item',
  template: template,
  modelEvents: {
    change: 'render'
  },
  serializeData: function() {
    var suggestion = this.model.toJSON();

    return {
      url: appendToUrl('/' + suggestion.uri, 'source=suggested'),
      avatarUrl: appendToUrl(suggestion.avatarUrl, 's=48'),
      name: suggestion.uri,
      description: suggestion.description,
      userCount: suggestion.userCount
    };
  }
});

module.exports = Marionette.CollectionView.extend({
  tagName: 'ul',
  className: 'suggested-room-list',
  childView: SuggestedRoomItemView
});
