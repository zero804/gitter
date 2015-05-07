"use strict";
var $ = require('jquery');
var _ = require('underscore');
var Marionette = require('marionette');
var behaviourLookup = require('./lookup');

var total = 0;
var tick = 0;
setInterval(function(f) {
  if (total > 0) {
    console.log('time taken: ', total / ++tick);
    total = 0;
  }
}, 1000);


module.exports = (function() {
  var cachedWidgets = {};

  function register(widgets) {
    var keys = _.keys(widgets);
    _.each(keys, function(key) {
      var value = widgets[key];
      cachedWidgets[key] = value;
    });
  }

  function WidgetManager() {
    this._widgets = [];
  }

  WidgetManager.prototype.add = function(widget) {
    this._widgets.push(widget);
  };

  WidgetManager.prototype.close = function() {
    _.each(this._widgets, function(item) {
      item.close();
    });
    this._widgets = [];
  };

  function render(template, data) {
    if (!template) {
     throw new Error("Cannot render the template since it's false, null or undefined.");
    }

    var templateFunc;
    if (typeof template === "function"){
     templateFunc = template;
    } else {
     templateFunc = Marionette.TemplateCache.get(template);
    }

    var generatedText = templateFunc(data);
    var view = data._view;

    if(!data.renderViews || !view) return generatedText;
    var t0 = performance.now();

    // Turn the text into a DOM
    var dom = $($.parseHTML(generatedText));
    // dom.addClass("view"); // TODO: drop this class in future

    var widgets = dom.find('view');
    var widgetManager = view.widgetManager;

    if(widgets.length && !widgetManager) {
      // Create a region manager
      widgetManager = new WidgetManager();
      view.widgetManager = widgetManager;
    }

    widgets.each(function () {
      var id = this.getAttribute('data-id'),
      attrs = data.renderViews[id];

      var Widget = cachedWidgets[attrs.widgetName];
      var widget = new Widget(attrs.model);
      widget.render();

      this.parentNode.replaceChild(widget.el, this);

      // Create a region
      widgetManager.add(widget);

      return widget;
    });

    var t1 = performance.now();
    total += t1 - t0;


    return dom;
  }

  var Behavior = Marionette.Behavior.extend({

    initialize: function() {
      if(this.view.templateHelpers) throw new Error('Cannot use templateHelpers with Widgets');
      this.view.templateHelpers = function() {
        // TODO: add global template helpers
        return { _view: this };
      };
    },
    onClose: function() {
      if(this.view.widgetManager) {
        this.view.widgetManager.close();
        this.view.widgetManager = null;
      }
    }
  });

  // No simple way to do this...
  Marionette.Renderer = {
    render: render
  };

  behaviourLookup.register('Widgets', Behavior);

  return {
    register: register,
    Behavior: Behavior
  };


})();
