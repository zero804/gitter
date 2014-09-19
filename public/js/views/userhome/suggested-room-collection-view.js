
define([
  'jquery-hammer',
  'marionette',
  'hbs!./tmpl/suggested-room-list-item',
  'utils/appevents',
  'utils/is-mobile'
], function($hammer, Marionette, repoListItemTemplate, appEvents, isMobile) {
  "use strict";

  var SuggestedRoomItemView = Marionette.ItemView.extend({
    tagName: 'li',
    className: 'suggested-room-list-item',
    template: repoListItemTemplate,
    modelEvents: {
      change: 'render'
    },
    initialize: function() {
      this.$el = $hammer(this.$el).hammer();
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
    events: function() {
      return isMobile() ? { tap: 'navigate' } : { click: 'navigate' };
    },
    navigate: function() {
      var uri = this.model.get('uri');
      var url = '/' + uri + '?source=suggested';
      appEvents.trigger('navigation', url, 'chat', uri);
      appEvents.trigger('track-event', 'suggested-room-click', { uri: uri });
    }
  });

  return Marionette.CollectionView.extend({
    tagName: 'ul',
    className: 'suggested-room-list',
    itemView: SuggestedRoomItemView
  });

});
