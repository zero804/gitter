'use strict';
var Handlebars = require('handlebars/runtime').default;

module.exports = (function () {
  var widgetId = 1;

  function Widget(widgetName, model) {
    var id = widgetId++;
    var prerenderedText = this.getPrerendered(widgetName, model.hash, id);
    
    if (!this.prerenderedViews) {
      this.prerenderedViews = {};
    }

    this.prerenderedViews[id] = {
      widgetName: widgetName,
      model: model.hash
    };

    return new Handlebars.SafeString(prerenderedText);
  }

  Handlebars.registerHelper('widget', Widget);
  return Widget;
})();
