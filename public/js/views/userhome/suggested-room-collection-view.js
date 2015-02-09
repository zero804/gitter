"use strict";

var Marionette = require('marionette');
var template = require('./tmpl/suggested-room-list-item.hbs');

module.exports = (function() {

  var SuggestedRoomItemView = Marionette.ItemView.extend({
    tagName: 'li',
    className: 'suggested-room-list-item',
    template: template,
    modelEvents: {
      change: 'render'
    },
    serializeData: function() {
      var suggestion = this.model.toJSON();

      var url = suggestion.exists ? '/' + suggestion.uri + '?source=suggested' : '#confirmSuggested/' + suggestion.uri;

      return {
        url: url,
        avatarUrl: suggestion.avatarUrl + 's=48',
        name: suggestion.uri,
        description: suggestion.description,
        userCount: suggestion.userCount
      };
    }
  });

  return Marionette.CollectionView.extend({
    tagName: 'ul',
    className: 'suggested-room-list',
    itemView: SuggestedRoomItemView
  });


})();

