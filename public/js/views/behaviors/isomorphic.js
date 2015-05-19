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


    function optionsForRegion(regionName, options) {
      var region = view.getRegion(regionName);

      var regionEl = region.$el[0] || view.$el.find(region.options.el)[0];
      if (!regionEl)
        throw new Error('Region ' + regionName + ' does not exist.');

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
    }

    var initRegionsFn = view.initRegions;
    var result;
    if (initRegionsFn) {
      /* initRegions method */
      result = initRegionsFn.call(view, optionsForRegion);

      if (!result) return;
    } else {
      /* non initRegions method */

      result = {};
      Object.keys(view.regions).forEach(function(regionName) {
        var initMethodName = 'init' + regionName.charAt(0).toUpperCase() + regionName.slice(1) + 'Region';
        var initMethod = view[initMethodName];
        if (initMethod)  {
          result[regionName] = initMethod.call(view, optionsForRegion);
        }
      });
    }

    // Attach!
    Object.keys(result).forEach(function(regionName) {
      var childView = result[regionName];
      if (childView) {
        view.showChildView(regionName, childView);
      }
    });

  }
});

behaviourLookup.register('Isomorphic', Behavior);

var Behavior2 = Marionette.Behavior.extend({
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
    var isoRegions = this.options;

    Object.keys(isoRegions).forEach(function(regionName) {
      var isoRegionDefn = isoRegions[regionName];
      var el = isoRegionDefn.el;
      var region = view.addRegion(regionName, el);
      var initMethod = isoRegionDefn.init;

      if(!initMethod) return;

      function optionsForRegion(options) {
        var regionEl = region.$el[0];
        if (!regionEl)
          throw new Error('Region ' + regionName + ' does not exist.');

        var regionElChildLen = regionEl.children.length;

        var baseOptions;
        if (regionElChildLen === 0) {
          baseOptions = {};
        } else if (regionElChildLen === 1) {
          baseOptions = { template: false, el: regionEl.children[0] };
        } else {
          throw new Error('Region can have zero or one elements, but not more. Region ' + regionName + " has " + regionElChildLen + ". Are you sure you wrapped the region with a parent?");
        }

        if(!options) return baseOptions;
        return _.extend(baseOptions, options);
      }

      var childView = initMethod.call(view, optionsForRegion);
      if(childView) {
        view.showChildView(regionName, childView);
      }
    });

  }
});

behaviourLookup.register('Isomorphic2', Behavior2);

module.exports = Behavior;
