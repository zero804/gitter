"use strict";
var _ = require('underscore');
var Marionette = require('backbone.marionette');
var behaviourLookup = require('./lookup');

var Behavior = Marionette.Behavior.extend({
  onRender: function() {
    this.setupRegions();
  },
  onBeforeShow: function() {
    this.setupRegions();
  },
  setupRegions: function() {
    /* Only perform setup once */
    if (this.setup) return;
    this.setup = 1;

    var view = this.view;

    var initRegionsFn = view.initRegions;
    var result = initRegionsFn.call(view, function(regionName, options) {
      var region = view.getRegion(regionName);

      var regionEl = region.$el[0];
      var regionElChildLen = regionEl.children.length;

      var baseOptions;
      if (regionElChildLen === 0) {
        baseOptions = {};
      } else if (regionElChildLen === 1) {
        baseOptions = { template: false, el: regionEl.children[0] };
      } else {
        throw new Error('Region can have zero or one elements, but not more. Region ' + regionName + " has " + regionElChildLen + ". Are you sure you wrapped the region with a parent?");
      }

      return _.extend(baseOptions, options);
    });

    if (!result) return;

    Object.keys(result).forEach(function(regionName) {
      var childView = result[regionName];
      if (childView) {
        view.showChildView(regionName, childView);        
      }
    });

  }
});

behaviourLookup.register('Isomorphic', Behavior);

module.exports = Behavior;
