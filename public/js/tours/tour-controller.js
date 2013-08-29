/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'hopscotch',
  'jquery',
  'backbone',
  'utils/cdn',
  'utils/appevents',
  'utils/context',
  'log!tour'
], function(hopscotch, $, Backbone, cdn, appEvents, context, log) {
  "use strict";

  var appIntegratedView;

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
    var i = getStepNumFor(id);
    if(i >= 0) {
      hopscotch.showStep(i);
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
        id: 'WELCOME',
        content: "Welcome to Troupe. This tour will take you through everything you need to know in order to get started. Click next to begin. ",
        target: ".trpHeaderTitle",
        placement: "bottom",
        showNextButton: true,
        showCTAButton: true,
        ctaLabel: 'Skip the tour',
        onCTA: function() {
          if(hopscotch.getCurrStepNum() === getStepNumFor('WELCOME')) {
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
        if(hopscotch.getCurrStepNum() === getStepNumFor('FIND_PEOPLE')) {
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
          appEvents.off('searchSearchView:success');
        }
      },
      {
        id: 'CONNECT_COMPLETE',
        title: "All done!",
        content: "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut la. Now wait for your friends to respond.",
        target: "finished-button",
        placement: "left",
        delay: 10
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
        placement: "left"
      },

    ]
  };

  var onShowHooked;
  var troupeTour = {
    id: "troupe",
    showPrevButton: false,
    showNextButton: false,
    steps: [
      {
        id: 'WELCOME',
        content: "Welcome to Troupe. This tour will take you through everything you need to know in order to get started. Click next to begin. ",
        target: ".trpHeaderTitle",
        placement: "bottom",
        showNextButton: true,
        showCTAButton: true,
        ctaLabel: 'Skip the tour',
        delay: 10,
        onCTA: function() {
          if(hopscotch.getCurrStepNum() === getStepNumFor('WELCOME')) {
            hopscotch.endTour();
          }
        }
      },
      {
        id: 'CHAT',
        target: "#chat-input-textarea",
        title: "Type in here to chat",
        content: "Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Type in an email address and press ENTER.",
        placement: "top",
        showNextButton: true,
        onShow: function() {
          $('#chat-input-textarea').focus();
          appEvents.once('chat.send', nextStep);
        },
        onHide: function() {
          appEvents.off('chat.send', nextStep);
        }
      },
      {
        id: 'MENU',
        target: "#menu-toggle",
        title: "Menu",
        content: "Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Type in an email address and press ENTER.",
        placement: "right",
        onShow: function() {
          if(onShowHooked) return;
          onShowHooked = true;
          appEvents.once('leftMenu:animationStarting', nextStep);
        },
        onHide: function() {
          appEvents.off('leftMenu:animationStarting', nextStep);
          onShowHooked = false;
        },
      },
      {
        id: 'MEGAMENU',
        target: "#icon-mega",
        title: "Integrated Menu",
        content: "Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Type in an email address and press ENTER.",
        placement: "bottom",
        xOffset: -18,
        delay: 450,
        showNextButton: true,
        onShow: function() {
          appIntegratedView.openLeftMenu();
          appIntegratedView.lockLeftMenuOpen();
        },
        onHide: function() {
          appIntegratedView.unlockLeftMenuOpen();
        }
      },
      {
        id: 'TROUPEMENU',
        target: "#icon-troupes",
        title: "Troupes",
        content: "Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Type in an email address and press ENTER.",
        placement: "bottom",
        xOffset: -18,
        showNextButton: true,
        onShow: function() {
          appIntegratedView.openLeftMenu();
          appIntegratedView.lockLeftMenuOpen();
        },
        onHide: function() {
          appIntegratedView.unlockLeftMenuOpen();
        }
      },
      {
        id: 'TROUPEONETOONE',
        target: "#icon-user",
        title: "Private Chats",
        content: "Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Type in an email address and press ENTER.",
        placement: "bottom",
        xOffset: -18,
        showNextButton: true,
        onShow: function() {
          appIntegratedView.openLeftMenu();
          appIntegratedView.lockLeftMenuOpen();
        },
        onHide: function() {
          appIntegratedView.unlockLeftMenuOpen();
        }
      },
      {
        id: 'TROUPESEARCH',
        target: "#icon-search",
        title: "Search",
        content: "Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Type in an email address and press ENTER.",
        placement: "bottom",
        xOffset: -18,
        showNextButton: true,
        onShow: function() {
          appIntegratedView.openLeftMenu();
          appIntegratedView.lockLeftMenuOpen();
        },
        onHide: function() {
          appIntegratedView.unlockLeftMenuOpen();
          appIntegratedView.closeLeftMenu();
        }
      },
      {
        id: 'PEOPLE-ROSTER',
        target: "#people-roster",
        title: "People Roster",
        content: "Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Type in an email address and press ENTER.",
        placement: "left",
        delay: 450,
        showNextButton: true
      },
      {
        id: 'FILE-LIST',
        target: "#file-header",
        title: "Files",
        content: "Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Type in an email address and press ENTER.",
        placement: "left",
        showNextButton: true
      },
      {
        id: 'MAIL-LIST',
        target: "#mail-header",
        title: "Email Conversations",
        content: "Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Type in an email address and press ENTER.",
        placement: "left",
        showNextButton: true
      },
    ]
  };


  var homeCreateTour = {
    id: "troupe2",
    showPrevButton: false,
    showNextButton: false,
    onEnd: function() {
      Backbone.history.on('route', function() {
        hopscotch.startTour(troupeTour, 1);
      });
    },
    steps: [
      {
        id: 'INVITE_USERS',
        title: "Search for people",
        content: "Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Type in an email address and press ENTER.",
        target: ".trpInviteModal input",
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
        target: "#submit-button",
        delay: 10,
        placement: "bottom",
        onShow: function() {
          appEvents.once('searchSearchView:success', nextStep);
        },
        onHide: function() {
          appEvents.off('searchSearchView:success', nextStep);
        }
      },
      {
        id: 'INVITE_URL',
        title: "Another way to invite people",
        content: "Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Type in an email address and press ENTER.",
        target: ".trpInviteModal #sharelink",
        placement: "left"
      }
    ]
  };


  function processTour(tour) {
    var stepIds = {};
    tour.steps.forEach(function(step, index) {
      if(step.id) stepIds[step.id] = index;
      step.originalTarget = step.target;
    });
    tour.stepIds = stepIds;
  }


  processTour(troupeTour);
  processTour(homeTour);
  processTour(homeCreateTour);

  var running = false;
  hopscotch.listen('start', function() {
    running = true;
  });

  hopscotch.listen('end', function() {
    running = false;
    executeHide();
  });

  hopscotch.listen('error', function() {
    var step = hopscotch.getCurrStepNum();
    var tour = hopscotch.getCurrTour();
    log('ERROR: step ' + step + ' of tour ' + (tour && tour.id));
    executeHide();
  });

  hopscotch.listen('close', function() {
    executeHide();
  });

  var lastStep;

  function executeHide(currentStep) {
    if(lastStep && lastStep !== currentStep) {
      if(lastStep.onHide) {
        lastStep.onHide();
      }
    }
    lastStep = currentStep;
  }

  hopscotch.listen('next', function() {
    executeHide();
  });

  hopscotch.listen('show', function() {
    var step = hopscotch.getCurrStepNum();
    var tour = hopscotch.getCurrTour();

    var newStep = tour.steps[step];
    executeHide(newStep);

    log('SHOW: step ' + step + ' of tour ' + (tour && tour.id));
  });

  function getStepNumFor(id) {
    var tour = hopscotch.getCurrTour();

    for(var i = 0; i < tour.steps.length; i++) {
      if(tour.steps[i].id === id) {
        return i;
      }
    }
  }



  function getStepForCurrentHash() {
    var hash = window.location.hash;
    var tour = hopscotch.getCurrTour();

    if(tour === homeTour) {
      if(hash.indexOf('connect') >= 0) {
        return getStepNumFor('CONNECT');
      }
      if(hash.indexOf('create') >= 0) {
        return getStepNumFor('CREATE_TROUPE_ENTRY');
      }

      return;
    }

    if(tour === troupeTour) {
      if(hash.indexOf('share') >= 0) {
        return getStepNumFor('INVITE_USERS');
      }
    }
  }

  var troupe = context.troupe();

  function selectTour() {
    var inTroupeContext = !!troupe.id;
    if(inTroupeContext) {
      var state = hopscotch.getState();
      if(state && state.indexOf('home') >= 0) {
        return homeCreateTour;
      }

      return troupeTour;
    } else {
      return homeTour;
    }
  }

  function updateTourOnHistoryChange() {
    var tour = hopscotch.getCurrTour();

    if(tour) {
      var step = getStepForCurrentHash();
      setTimeout(function() {
        if(step >= 0) {
          hopscotch.showStep(step);
        } else {
          hopscotch.nextStep();
        }
      }, 100);
    }
  }

  return {
    init: function(options) {
      appIntegratedView = options.appIntegratedView;
      Backbone.history.on('route', updateTourOnHistoryChange);
      appEvents.on('leftMenu:animationComplete', function() {
        hopscotch.adjustBubblePosition();
      });

      var tour = selectTour();
      if(tour) {
        var step = getStepForCurrentHash();
        if(!step) step = 0;
        hopscotch.startTour(tour, step);
      }
    }
  };


});