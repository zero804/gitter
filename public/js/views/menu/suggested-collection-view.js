"use strict";
var roomNameTrimmer = require('utils/room-name-trimmer'); // TODO: move this to shared
var Marionette = require('backbone.marionette');
var template = require('./tmpl/suggested-list-item.hbs');

module.exports = (function() {

  var SuggestedItemView = Marionette.ItemView.extend({
    tagName: 'li',
    className: 'room-list-item',
    template: template,
    modelEvents: {
      change: 'render',
    },
    serializeData: function() {
      var data = this.model.toJSON();
      data.uri = roomNameTrimmer(data.uri);
      data.linkUrl = data.exists ? '/' + this.model.get('uri') : '#confirm/' + this.model.get('uri');
      data.userOrOrg = this.model.get('uri').split('/')[0];
      return data;
    }
  });

  return Marionette.CollectionView.extend({
    tagName: 'ul',
    className: 'room-list',
    childView: SuggestedItemView
  });


})();
