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
        content: "Welcome to Troupe. This tour will take you through everything you need to know in order " +
                 "to get started. Click next to begin. ",
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
       content: "Create connections with your colleagues, suppliers and other people you work with.<br><br>" +
                "Click on the head icon to find and invite people.",
       target: "#home-add-people img",
       placement: "top"
      },
      /*
       *
       */
      {
        id: 'CONNECT',
        title: "Invite via email",
        content: "Enter the email address of the person you want to connect with and then click Invite.",
        target: "#share-form input",
        placement: "left",
        showNextButton: true,
        onShow: function() {
          appEvents.once('searchSearchView:success', nextStep);
        },
        onHide: function() {
          appEvents.off('searchSearchView:success', nextStep);
        }
      },
      {
        id: 'CONNECT_LINK',
        title: "Invite via share link",
        content: "You can also share this link with your colleagues.",
        target: "#sharelink",
        placement: "bottom",
        delay: 100,
        showNextButton: true
      },
      {
        id: 'CONNECT_COMPLETE',
        title: "All done!",
        content: "You can invite as many colleagues as you like and when you are finished, click here.",
        target: ".trpInviteModal .close",
        placement: "right",
        onShow: function() {
          $('.trpInviteModal .close').once('click', nextStep);
        },
        onHide: function() {
          $('.trpInviteModal .close').off('click', nextStep);
        },
        delay: 10
      },
      {
       id: 'CREATE_TROUPE',
       title: "Create a troupe",
       content: "A troupe is a collaborative space, shared by all its members. You can create as many as you wish. " +
                "Create one for a project, one for the theatre club and another for your team. Click this icon to " +
                "create a troupe",
       target: "#home-create-troupe img",
       placement: "top"
      },
      /*
       * Now within the context of a troupe!
       */
      {
        id: 'CREATE_TROUPE_ENTRY',
        title: "Choose a name for your troupe",
        content: "This should be a good description of the topic. It doesn't have to be unique. " +
                 "Remember that you can always change it later on if you wish. Some examples: " +
                 "<em>Project Zeus</em>, <em>Friday Night Comedy Club</em> or <em>Marketing Department<em>.",
        target: ".trpCreateForm input",
        placement: "left"
      },
      {
        id: 'INVITE_USERS',
        title: "Search and add people",
        content: "For each person that you would like to invite into the troupe, search for them by name or email and then click invite. " +
                 "You can also import your Google Contacts address book by clicking the '<em>Import gmail contacts</em>' " +
                 "button below. Once they've been imported, you'll be able to search for people by name.",
        target: ".trpInviteModal input",
        placement: "left",
        onShow: function() {
          appEvents.once('searchSearchView:success', nextStep);
        },
        onHide: function() {
          appEvents.off('searchSearchView:success', nextStep);
        }
      },
      {
        id: 'INVITE_LINK',
        title: "Another way to invite people",
        yOffset: -20,
        content: "Every troupe has a unique link. Share this link out and people can join after requesting access " +
                 "(don't worry, you'll get to chose whether they can join!).<br><br>Click the copy button to " +
                 "copy it into your clipboard for sharing.",
        target: ".trpInviteModal #sharelink",
        placement: "left",
        onShow: function() {
          Backbone.history.once('route', nextStep);
        },
        onHide: function() {
          Backbone.history.off('route', nextStep);
        }
      }
    ]
  };

  var emailAddress = context.troupe().get('uri') + '@' + context.env('baseServer');

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
        content: "You can chat by entering your message in this text box and pressing ENTER to send it.",
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
        content: "Move your mouse over the tab to pull out the navigation menu. From this menu you can access your " +
                 "connections, your troupes, and action items.<br><br>Move your mouse over the tab to continue the tour.",
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
        content: "Access invitations, favourite and recent troupes and troupes with unread items from this menu.",
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
        content: "This menu contains a list of all your troupes",
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
        content: "For private chats, select this menu",
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
        content: "Search through all your connections and troupes from this menu. " +
                 "Or just start typing when the menu is open, and we'll start searching.",
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
        content: "This shows you a list of all the people in the troupe. The dot in the upper left corner indicates " +
                 "whether they are currently viewing the troupe.<br><br>Click on a person for more details.",
        placement: "left",
        delay: 450,
        showNextButton: true
      },
      {
        id: 'FILE-LIST',
        target: "#file-header",
        title: "Files",
        content: "This is where files are shown. To add a file, simply drag it anywhere into the troupe window. " +
                 "We'll keep all the versions of your files too.<br><br>Click on a file for more details or to access " +
                 "other versions.",
        placement: "left",
        showNextButton: true
      },
      {
        id: 'MAIL-LIST',
        target: "#mail-header",
        title: "Email Conversations",
        content: "Any emails you send to <strong>" + emailAddress + "</strong> will be distributed to all members of the troupe, " +
                 "and you can access them here too.<br><br>What's more, any file attachments will be added to the " +
                 "troupe and we'll even version them too.",
        placement: "top",
        showNextButton: true
      },
      {
        id: 'TROUPE-SETTINGS',
        target: "#uvTab",
        title: "Get in Touch!",
        content: "That's the end of the tour, but if you have any questions, suggestions or feedback," +
                " we'd love to hear from you: click this button to get in touch." +
                "<br><br>We hope you enjoy collaborating via Troupe.",
        placement: "top",
        arrowOffset: 230,
        xOffset: -210,
        showNextButton: true
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

  homeTour.steps = homeTour.steps.concat(troupeTour.steps.slice(1));
  processTour(troupeTour);
  processTour(homeTour);

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

  function resumeOrStartTour() {
    var troupe = context.troupe();
    var inTroupeContext = !!troupe.id;

    var state = hopscotch.getState();
    if(state) {
      if(state.indexOf('home:') === 0) {
        // Home tour is in either context
        hopscotch.startTour(homeTour);
        return;
      } else if(state.indexOf('troupe:') === 0) {
        // Troupe tour is only in troupe context
        if(inTroupeContext) {
          hopscotch.startTour(troupeTour);
          return;
        }
      }
    }


    var tour = inTroupeContext ? troupeTour : homeTour;
    var step = getStepForCurrentHash();
    if(!step) step = 0;
    hopscotch.startTour(tour, step);
  }

  return {
    init: function(options) {
      appIntegratedView = options.appIntegratedView;
      Backbone.history.on('route', updateTourOnHistoryChange);
      appEvents.on('leftMenu:animationComplete', function() {
        hopscotch.adjustBubblePosition();
      });

      resumeOrStartTour();
    }
  };


});