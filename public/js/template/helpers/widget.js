/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'handlebars'
], function ( Handlebars ) {
  "use strict";

  function Widget( widgetName, model ) {
    if(!this.renderViews) {
      this.renderViews = [];
    }

    this.renderViews.push({
      widgetName: widgetName,
      model: model.hash
    });

    return new Handlebars.SafeString("<view data-id='" + (this.renderViews.length - 1) + "'></view>");
  }

  Handlebars.registerHelper( 'widget', Widget );
  return Widget;

});
