/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'hopscotch',
  'backbone',
  'underscore',
  'utils/cdn',
  'utils/appevents'
], function(hopscotch, Backbone, _, cdn, appEvents) {
  "use strict";


  function loadCss(url) {
      var link = document.createElement("link");
      link.type = "text/css";
      link.rel = "stylesheet";
      link.href = url;
      document.getElementsByTagName("head")[0].appendChild(link);
  }

  // Late load this to speedup requirejs startup time
  loadCss(cdn('repo/hopscotch/css/hopscotch.css'));

  function showStep(id) {
    console.log('showStep ' + id);
    var i = getStepNumFor(id);
    if(i >= 0) {
      hopscotch.showStep(i);
    }
  }

  function getStepNumFor(id) {
    for(var i = 0; i < homeTour.steps.length; i++) {
      if(homeTour.steps[i].id === id) {
        return i;
      }
    }
  }

  function nextStep() {
   hopscotch.nextStep();
  }

  var homeTour = {
    id: "home",
    showPrevButton: false,
    showNextButton: false,
    steps: [
      {
        content: "Welcome to Troupe. This tour will take you through everything you need to know in order to get started. Click next to begin. ",
        target: ".trpHeaderTitle",
        placement: "bottom",
        showNextButton: true,
        showCTAButton: true,
        ctaLabel: 'Skip the tour',
        onCTA: function() {
          if(hopscotch.getCurrStepNum() === 0) {
            hopscotch.endTour();
          }
        }
      },
      {
       id: 'FIND_PEOPLE',
       title: "Find People",
       content: "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. ",
       target: "#home-add-people img",
       placement: "top",
       showSkip: true,
       showNextButton: true,
       showCTAButton: true,
       ctaLabel: 'Find your connections',
       onCTA: function() {
        expectingRouteUpdate = true;
        if(hopscotch.getCurrStepNum() === getStepNumFor('FIND_PEOPLE')) {

          appEvents.once('searchSearchView:show', function() {
            showStep('CONNECT');
            expectingRouteUpdate = false;
          });

          window.location.assign('#|connect');

        }
       }
      },
      /*
       *
       */
      {
        id: 'CONNECT',
        title: "My Header",
        content: "Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Type in an email address and press ENTER.",
        target: "#share-form input",
        placement: "left",
        onShow: function() {
          appEvents.once('searchSearchView:select', nextStep);
        },
        onHide: function() {
          appEvents.off('searchSearchView:select', nextStep);
        }
      },
      {
        title: "Now send your invitations",
        content: "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Click the invite button",
        target: "submit-button",
        delay: 10,
        placement: "bottom",
        onShow: function() {
          appEvents.once('searchSearchView:success', function() {
            showStep('CONNECT_COMPLETE');
          });
        },
        onHide: function() {
          console.log('OFF searchSearchView:success')
          appEvents.off('searchSearchView:success');
        }
      },
      {
        id: 'CONNECT_COMPLETE',
        title: "All done!",
        content: "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut la. Now wait for your friends to respond.",
        target: "finished-button",
        placement: "left",
        delay: 10,
        onShow: function() {
          expectingRouteUpdate = true;
          Backbone.history.once('route', nextStep);
        },
        onHide: function() {
          expectingRouteUpdate = false;
          Backbone.history.off('route', nextStep);
        }
      },
      {
       id: 'CREATE_TROUPE',
       title: "Create a troupe",
       content: "A troupe Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. ",
       target: "#home-create-troupe img",
       placement: "top",
       showSkip: true,
       showCTAButton: true,
       ctaLabel: 'Create a new Troupe',
       onCTA: function() {
        if(hopscotch.getCurrStepNum() === getStepNumFor('CREATE_TROUPE')) {
          window.location.assign('#|create');
        }
       }
      },
      /*
       *
       */
      {
        id: 'CREATE_TROUPE_ENTRY',
        title: "Choose a name for your troupe",
        content: "Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Type in an email address and press ENTER.",
        target: ".trpCreateForm input",
        placement: "left",
        onShow: function() {
          appEvents.once('searchSearchView:select', nextStep);
        },
        onHide: function() {
          appEvents.off('searchSearchView:select', nextStep);
        }
      },

    ]
  };


  var running = false;
  var expectingRouteUpdate = false;
  hopscotch.listen('start', function() {
    running = true;
    console.log('START');
  });

  hopscotch.listen('end', function() {
    running = false;
    console.log('END');
  });

  Backbone.history.on('route', function() {
    if(running && !expectingRouteUpdate) {
      hopscotch.showStep(getStepForCurrentHash());
    }
  });

  function getStepForCurrentHash() {
    if(window.location.hash.indexOf('connect') >= 0) {
      return getStepNumFor('CONNECT');
    }
    if(window.location.hash.indexOf('create') >= 0) {
      return getStepNumFor('CREATE_TROUPE_ENTRY');
    }
    return 0;
  }

  return {
    start: function() {
      hopscotch.startTour(homeTour, getStepForCurrentHash());
    }
  };


});