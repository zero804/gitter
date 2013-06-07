/*jshint unused:true, node:true */
"use strict";

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var _ = require('underscore');

var NotificationCollector = function(options) {
  this.collection = {};
  this.userCategorisationStrategy = options.userCategorisationStrategy;
  this.collect = _.debounce(this.collectTimeout.bind(this), options.collectionTime || 500);
};

util.inherits(NotificationCollector, EventEmitter);

NotificationCollector.prototype.incomingNotification = function(userId, itemType, items, troupeId) {
  if(['chat', 'file', 'request'].indexOf(itemType) < 0) return false;

  var key = userId + ':' + troupeId;
  var itemsMapped = items.map(function(itemId) { return { itemType: itemType, itemId: itemId }; });

  var userItem = this.collection[key];
  if(!userItem) {
    this.collection[key] = { userId: userId, troupeId: troupeId, items: itemsMapped };
  } else {
    var i = this.collection[key];
    i.items = i.items.concat(itemsMapped);
  }

  this.collect();
};

NotificationCollector.prototype.collectTimeout = function() {
  var collection = this.collection;
  this.collection = {};

  var self = this;

  var userTroupes = Object.keys(collection).map(function(key) { return collection[key]; });

  this.userCategorisationStrategy(userTroupes, function(err, categories) {

    Object.keys(categories).forEach(function(category) {
      var userTroupes = categories[category];
      if(userTroupes && userTroupes.length) {
        this.emit('collection:' + category, categories[category]);
      }
    }, self);

  });
};


module.exports = NotificationCollector;