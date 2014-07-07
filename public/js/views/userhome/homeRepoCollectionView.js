
define([
  'jquery-hammer',
  'marionette',
  'views/base',
  'hbs!./tmpl/homeRepoListItem',
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
      return this.model.toJSON();
    },
    events: function() {
      return isMobile() ? { tap: 'navigate' } : { click: 'navigate' };
    },
    navigate: function() {
      var url = '/' + this.model.get('uri');
      var name = this.model.get('name');
      appEvents.trigger('navigation', url, 'chat', name);
    }
  });

  return Marionette.CollectionView.extend({
    tagName: 'ul',
    className: 'suggested-room-list',
    itemView: TroupeItemView
  });

});
