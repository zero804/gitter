'use strict';
var Handlebars = require('handlebars/runtime').default;

module.exports = (function () {

  function Widget(widgetName, model) {

    if (!this.renderViews) {
      this.renderViews = [];
    }

    this.renderViews.push({
      widgetName: widgetName,
      model: model.hash
    });

    return new Handlebars.SafeString("<view data-id='" + (this.renderViews.length - 1) + "'></view>");
  }

  Handlebars.registerHelper('widget', Widget);
  return Widget;
})();

