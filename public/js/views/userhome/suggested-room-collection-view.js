
define([
  'marionette',
  './tmpl/suggested-room-list-item.hbs',
  'utils/appevents'
], function(Marionette, repoListItemTemplate, appEvents) {
  "use strict";

  var SuggestedRoomItemView = Marionette.ItemView.extend({
    tagName: 'li',
    className: 'suggested-room-list-item',
    template: repoListItemTemplate,
    modelEvents: {
      change: 'render'
    },
    serializeData: function() {
      var suggestion = this.model.toJSON();

      return {
        avatarUrl: suggestion.avatarUrl + 's=48',
        name: suggestion.uri,
        description: suggestion.description,
        userCount: suggestion.userCount
      };
    },
    events: {
      click: 'navigate'
    },
    navigate: function() {
      var uri = this.model.get('uri');

      if(this.model.get('exists')) {
        var url = '/' + uri + '?source=suggested';
        appEvents.trigger('navigation', url, 'chat', uri);
      } else {
        appEvents.trigger('navigation', '#confirm/' + uri);
      }
      appEvents.trigger('track-event', 'suggested-room-click', { uri: uri });
    }
  });

  return Marionette.CollectionView.extend({
    tagName: 'ul',
    className: 'suggested-room-list',
    itemView: SuggestedRoomItemView
  });

});
