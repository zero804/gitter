"use strict";
var Marionette = require('backbone.marionette');
var _ = require('underscore');
var moment = require('moment');
var context = require('utils/context');
var widgets = require('views/behaviors/widgets');
var FastAttachMixin = require('views/fast-attach-mixin');
var timeFormat = require('gitter-web-shared/time/time-format');
var template = require('./tmpl/timeago.hbs');

require('views/behaviors/tooltip');

var ONEDAY = 86400000;

module.exports = (function() {

  var getPermalinkForChatItem = function(id, roomName) {
    return context.env('basePath') + '/' + roomName + '?at=' + id;
  };

  var serializeData = function(model, options) {
    var messageId = options.chatItemModel.get('id');
    var roomName = options.roomName;

    var data = {
      widgetId: options.widgetId,
      permalinkUrl: getPermalinkForChatItem(messageId, roomName)
    };

    return data;
  };

  var lang = context.lang();

  var TimeagoWidget = Marionette.ItemView.extend({
    tagName: 'a',
    template: template,

    modelEvents: {
      'change': 'onChange'
    },
    behaviors: {
      Tooltip: {
        '': { titleFn: 'getTooltip', positionFn: 'getTooltipPosition', html: true },
      }
    },
    initialize: function(options) {
      this.roomName = options.roomName;
      this.chatItemModel = options.chatItemModel;
      this.messageId = this.chatItemModel.get('id');

      this.time = moment(options.time).locale(lang);
      this.compact = options.compact;
      this.position = options.position || "top";
      this.tooltipFormat = options.tooltipFormat || 'LLL';

      this.calculateNextTimeout();

      this.listenTo(this.chatItemModel, 'change', this.onChatItemModelChange);
    },

    onDestroy: function() {
      clearTimeout(this.timer);
    },

    getTooltip: function() {
      return this.time.locale(lang).format(this.tooltipFormat);
    },

    getTooltipPosition: function() {
      return this.position;
    },

    calculateNextTimeout: function() {
      var duration = Math.floor((Date.now() - this.time.valueOf()) / 1000);

      var secondsToRefresh;

      if(duration >= 86400) {
        /* No more updates needed */
        delete this.timer;
        return;
      } else if(duration >= 3600 /* More than an hour */) {
        secondsToRefresh = 3600 - duration % 3600;
      } else {
        secondsToRefresh = 60 - duration % 60;
      }

      if(secondsToRefresh < 1) secondsToRefresh = 1;

      this.timer = window.setTimeout(this.rerenderOnTimeout.bind(this), secondsToRefresh * 1000);
    },

    onChatItemModelChange: function(changes) {
      if(changes && 'id' in changes) {
        this.messageId = this.chatItemModel.get('id');
        this.render();
      }
    },

    serializeData: function() {
      var options = this.options || {};
      var model = this.model && this.model.toJSON();
      return serializeData(model, options);
    },

    rerenderOnTimeout: function() {
      this.calculateNextTimeout();
      this.render();
    },

    render: function() {
      this.el.textContent = timeFormat(this.time, { compact: this.compact });

      var longFormat = this.time.format("LLL");
      this.el.setAttribute('title', longFormat);

      this.el.setAttribute('href', getPermalinkForChatItem(this.messageId, this.roomName));

      this.triggerMethod("render", this);
    },


    attachElContent: FastAttachMixin.attachElContent
  });

  TimeagoWidget.getPrerendered = function(model, id) {
    this.widgetId = id;
    return template(serializeData(null, _.extend(model, {
      widgetId: id
    })));
  };

  widgets.register({ timeago: TimeagoWidget });

  return TimeagoWidget;


})();
