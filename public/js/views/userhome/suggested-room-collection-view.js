
define([
  'jquery-hammer',
  'marionette',
  'views/base',
  'hbs!./tmpl/suggested-room-list-item',
  'utils/appevents',
  'utils/is-mobile'
], function($hammer, Marionette, TroupeViews, repoListItemTemplate, appEvents, isMobile) {
  "use strict";

  var TroupeItemView = TroupeViews.Base.extend({
    tagName: 'li',
    className: 'suggested-room-list-item',
    template: repoListItemTemplate,
    initialize: function() {
      this.$el = $hammer(this.$el).hammer();
      this.setRerenderOnChange(true);
    },
    getRenderData: function() {
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
    itemView: TroupeItemView
  });

});
