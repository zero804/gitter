/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'backbone',
  'underscore',
  'jquery'
], function(Backbone, _, $) {
  "use strict";

  function track(name) {
    $(document).trigger('track', name);
  }

  var installClickTrigger = _.once(function() {
    $(document).on("click", "a", function(event) {
      if(this.href) {
        var href = $(this).attr('href');
        if(href.substring(0, 2) === "#|") {
          event.preventDefault();

          href = href.substring(2);

          var currentFragment;
          var hash = window.location.hash;

          if(!hash) {
            currentFragment = '#';
          } else {
            currentFragment = hash.split('|', 1)[0];
          }

          window.location = currentFragment + "|" + href;
        }
      }

      return true;
    });


  });

  function getFragmentsFromPath(path) {
    var hash = window.location.hash;
    if (hash.indexOf('#%7C') === 0) {
      window.location.hash = hash.replace(/%7C/, '|');
      path = path.replace(/%7C/, '|');
    }

    var rawFragments = path ? path.split("|") : [];

    var fragments = rawFragments.map(function(fragment) {

      if(fragment.substring(0, 2) === '#!') {
        fragment = fragment.substring(2);
      } else if(fragment.substring(0, 1) === '#') {
        fragment = fragment.substring(1);
      }

      return fragment;

    });

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
        $(document).trigger('appNavigation');

        return;
      }
    }

    /* Default case: load the view from scratch */
    var viewOptions = _.extend({ model: model, collection: viewDetails.collection }, viewDetails.viewOptions);
    var view = new viewDetails.viewType(viewOptions);
    region.show(view);
    $(document).trigger('appNavigation');
  }

  var Router = function() {
    Backbone.Router.apply(this, arguments);
  };

  _.extend(Router.prototype, Backbone.Router.prototype, {
    initialize: function(options) {
      installClickTrigger();
      this.regions = options.regions;
      this.previousFragments = {};
      this.route(/^(.*?)$/, "handle");
      this.routes = options.routes;
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
        id: result[1]
      };
    },

    handle: function(path) {
      var fragments = getFragmentsFromPath(path);

      var regionUpdateList = [
        {
          regionName: 'rightPanelRegion',
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

        if(!viewDetails) {
          // no match, so we clean up region
          track('unknown');
          update.region.close();
          return;
        }

        track(viewDetails.name);
        triggerRegionUpdate(update.region, viewDetails);

      }, this);
    }

  });
  return Router;
});
