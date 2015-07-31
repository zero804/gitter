"use strict";

var EventEmitter = require('events').EventEmitter;
var util = require('util');
var _ = require('underscore');
var debug = require('debug')('gitter:notification-collector');

var NotificationCollector = function (options) {
  this.collection = {};
  this.itemCount = 0;
  this.userCategorisationStrategy = options.userCategorisationStrategy;
  this.collect = _.throttle(this.collectTimeout.bind(this), options.collectionTime || 500, { leading: false });
};

util.inherits(NotificationCollector, EventEmitter);

NotificationCollector.prototype.incomingNotification = function (userId, itemType, items, troupeId) {
  debug('Incoming notification collection started');  
  if (itemType !== 'chat') return false;
  var key = userId + ':' + troupeId;
  var itemsMapped = items.map(function (itemId) { return { itemType: itemType, itemId: itemId }; });

  var userItem = this.collection[key];
  if (!userItem) {
    this.collection[key] = { userId: userId, troupeId: troupeId, items: itemsMapped };
  } else {
    var i = this.collection[key];
    i.items = i.items.concat(itemsMapped);
  }
  this.itemCount++;

  if (!this.collectSoon) {
    if (this.itemCount > 2000) {
      this.collectSoon = true;
      // Performing immediate collection
      setTimeout(this.collectTimeout.bind(this), 1);
    } else {
      this.collect();
    }
  }
  debug('Incoming notification collection finished');
};

NotificationCollector.prototype.collectTimeout = function () {
  var collection = this.collection;
  this.collection = {};
  this.itemCount = 0;
  var self = this;
  delete this.collectSoon;

  var userTroupes = Object.keys(collection).map(function (key) { return collection[key]; });

  if (userTroupes.length === 0) return;

  this.userCategorisationStrategy(userTroupes, function (err, categories) {

    Object.keys(categories).forEach(function (category) {
      var userTroupes = categories[category];
      if (userTroupes && userTroupes.length) {
        this.emit('collection:' + category, categories[category]);
      }
    }, self);

  });
};


module.exports = NotificationCollector;
