define([
  'utils/room-name-trimmer',
  'marionette',
  'hbs!./tmpl/suggested-list-item',
  'utils/appevents'
], function(roomNameTrimmer, Marionette, suggestedListItemTemplate, appEvents) {
  "use strict";

  function getRepoClass(data) {
    if(!data.exists) return 'room-list-item__name--suggested';
    return 'github-' + data.githubType;
  }

  var SuggestedItemView = Marionette.ItemView.extend({
    tagName: 'li',

    className: 'room-list-item',

    template: suggestedListItemTemplate,

    modelEvents: {
      change: 'render',
    },

    events: {
      click: 'clicked'
    },

    serializeData: function() {
      var data = this.model.toJSON();
      data.uri = roomNameTrimmer(data.uri);
      data.repoTypeClass = getRepoClass(data);
      return data;
    },

    clicked: function(e) {
      e.preventDefault();
      if(this.model.get('exists')) {
        appEvents.trigger('navigation', '/' + this.model.get('uri'), 'chat', this.model.get('uri'), null);
      } else {
        window.location.hash = '#confirm/' + this.model.get('uri');
      }
    }
  });

  return Marionette.CollectionView.extend({
    tagName: 'ul',
    className: 'room-list',
    itemView: SuggestedItemView
  });

});
