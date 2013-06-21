/*jshint unused:true, browser:true */
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

  var Router = function() {
    Backbone.Router.apply(this, arguments);
  };

  _.extend(Router.prototype, Backbone.Router.prototype, {
    initialize: function(options) {
      installClickTrigger();
      this.appView = options.appView;
      this.regionsFragments = {};
      this.route(/^(.*?)$/, "handle");
      this.routes = options.routes;
    },

    regionFragmentMapping: [
      'rightPanelRegion',
      'dialogRegion'
    ],

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
      var h = window.location.hash;
      if (h.indexOf('#%7C') === 0) {
        window.location.hash = h.replace(/%7C/, '|');
        path = path.replace(/%7C/, '|');
      }
      var parts = path ? path.split("|") : [];

      this.regionFragmentMapping.forEach(function(regionName, index) {
        var fragment = parts[index] ? parts[index] : "";

        if(fragment.substring(0, 1) === '#') {
          fragment = fragment.substring(1);
        }

        var region, viewDetails;

        function loadItemIntoView() {
          var model = viewDetails.skipModelLoad ? null : viewDetails.collection.get(viewDetails.id);
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

        if(this.regionsFragments[regionName] !== fragment) {
          this.regionsFragments[regionName] = fragment;

          region = this.appView[regionName];

          if(fragment) {
            // lookup handler:
            viewDetails = this.getViewDetails(fragment);

            if(viewDetails) {
              track(viewDetails.name);

              // If we have a collection and we need to load a model item,
              // ensure that the collection has already been populated. If it
              // hasn't, wait until it has
              if(!viewDetails.skipModelLoad) {
                if(viewDetails.collection.length === 0) {
                  viewDetails.collection.once('reset', loadItemIntoView, this);
                  return;
                }
              }

              loadItemIntoView();
              return;
            } else {
              track('unknown');
            }
          }

          region.close();
        } else {
          // This hasn't changed....
        }
      }, this);
    }

  });
  return Router;
});
