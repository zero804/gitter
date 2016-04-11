"use strict";

var Marionette        = require('backbone.marionette');
var Backbone          = require('backbone');
var _                 = require('underscore');

var View = Marionette.CollectionView.extend({
  tagName: 'ul',
  childView: Marionette.ItemView.extend({
    tagName: 'li',
    template: _.template("<%= text %>")
  }),
  initialize: function() {
    this.collection = new Backbone.Collection([]);
  },
  resetFromHash: function(notificationFeaturesHash) {
    var features = [];
    if (notificationFeaturesHash.unread) {
      features.push({ id: 1, text: 'Show unread item counts' });
    }

    if (notificationFeaturesHash.activity) {
      features.push({ id: 2, text: 'Show activity indicator on chat' });
    }

    if (notificationFeaturesHash.desktop) {
      features.push({ id: 5, text: 'Notify for all chats' });
    }

    if (notificationFeaturesHash.mention) {
      features.push({ id: 3, text: 'Notify when you\'re mentioned' });
    }

    if (notificationFeaturesHash.announcement) {
      features.push({ id: 4, text: 'Notify on @/all announcements' });
    }

    // For now, desktop = mobile so don't confuse the user
    // if (notificationFeaturesHash.mobile) {
    //   features.push({ id: 6, text: 'Mobile notifications for chats' });
    // }

    this.collection.reset(features);
    return features.length;
  }

});

module.exports = View;
