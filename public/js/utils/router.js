"use strict";
var Backbone = require('backbone');
var _ = require('underscore');
var appEvents = require('utils/appevents');

module.exports = (function() {


  function track(name) {
    appEvents.trigger('track', name);
  }

  function getFragmentsFromPath(path) {
    var lowerCaseHash = window.location.hash.toLowerCase();
    if (lowerCaseHash.indexOf('#%7c') === 0 || lowerCaseHash.indexOf('#!%7c') === 0) {
      window.location.hash = window.location.hash.replace(/%7c/i, '|');
      path = path.replace(/%7c/i, '|');
    }
    if(path) {
      path = path.replace('!', '');
      path = path.replace('#', '');
    }

    var fragments = path ? path.split("|") : [];

    return fragments;
  }

  function triggerRegionUpdate(region, viewDetails) {
    if(!viewDetails.skipModelLoad && viewDetails.collection.length === 0) {
      // we need to wait for models in the collection before render
      viewDetails.collection.once('reset sync', function() {
        renderViewInRegion(region, viewDetails);
      });

    } else {
      renderViewInRegion(region, viewDetails);
    }
  }

  function renderViewInRegion(region, viewDetails) {
    var model;

    if(viewDetails.skipModelLoad) {
      model = null;
    } else {
      model = viewDetails.collection.get(viewDetails.id);
      if(!model) {
        // The model doesn't exist. Exit.
        return;
      }
    }

    var cv = region.currentView;

    if(viewDetails.collection) {
      if(cv instanceof viewDetails.viewType &&
        cv.supportsModelReplacement &&
        cv.supportsModelReplacement()) {
        cv.replaceModel(model);
        appEvents.trigger('appNavigation');

        return;
      }
    }

    /* Default case: load the view from scratch */
    var viewOptions = _.extend({ model: model, collection: viewDetails.collection }, viewDetails.viewOptions);
    var view = new viewDetails.viewType(viewOptions);
    region.show(view);
    appEvents.trigger('appNavigation');
  }

  var Router = Backbone.Router.extend({
    initialize: function(options) {
      // installClickTrigger();
      if(options) {
        this.regions = options.regions || this.regions;
        this.routes = options.routes || this.routes;
        this.rootHandler = options.rootHandler || this.rootHandler;
      }
      this.previousFragments = {};
      this.route(/^(.*?)$/, "handle");
    },

    getViewDetails: function(fragment) {
      var match = null;

      _.any(this.routes, function(route) {
        if(route.re.test(fragment)) {
          match = route;
          return true;
        }
      });

      if(!match) return null;

      var result = match.re.exec(fragment);

      return {
        viewType: match.viewType,
        collection: match.collection,
        viewOptions: match.viewOptions,
        skipModelLoad: match.skipModelLoad ? match.skipModelLoad : /* If there is no collection, skipModelLoad=true */ !match.collection,
        name: match.name,
        validationCheck: match.validationCheck,
        id: result[1]
      };
    },

    handle: function(path) {
      var fragments = getFragmentsFromPath(path);

      var regionUpdateList = [
        {
          regionName: 'dialogRegion',
          fragment : fragments[0] || '',
          region: this.regions[0]
        },
        {
          regionName: 'dialogRegion',
          fragment : fragments[1] || '',
          region: this.regions[1]
        }
      ];

      regionUpdateList.forEach(function(update) {

        if(!update.region || this.previousFragments[update.regionName] === update.fragment) {
          // nothing to update
          return;
        }

        this.previousFragments[update.regionName] = update.fragment;

        if(!update.fragment) {
          // user has navigated away from region
          update.region.close();
          return;
        }

        var viewDetails = this.getViewDetails(update.fragment);

        if(viewDetails && viewDetails.validationCheck && !viewDetails.validationCheck()) {
          viewDetails = null;
        }

        if(!viewDetails) {
          // no match, so we clean up region
          track('unknown');
          update.region.close();
          return;
        }

        track(viewDetails.name);
        triggerRegionUpdate(update.region, viewDetails);

      }, this);

      if(fragments.length === 0) {
        this.rootHandler();
      }
    },

    rootHandler: function() {}

  });
  return Router;

})();

