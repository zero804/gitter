/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define(['jquery', 'hopscotch','utils/cdn'], function($, hopscotch, cdn) {
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

  var tours = {
    'troupe': {
      id: "troupe",
      steps: [
        {
         title: "Chat",
         content: "This is where you chat",
         target: "chat-input-textarea",
         placement: "top"
        },
        {
          title: "My Header",
          content: "This is the header of my page.",
          target: "menu-toggle",
          placement: "right"
        },
        {
          title: "My Header",
          content: "This is the header of my page.",
          target: "people-roster",
          placement: "left"
        },
        {
          title: "My Header",
          content: "This is the header of my page.",
          target: "file-list",
          placement: "left"
        }
      ]
    },
    'home': {
      id: "home",
      showPrevButton: true,
      steps: [
        {
          content: "Welcome to Troupe. This tour will take you through everything you need to know in order to get started. Click next to begin. ",
          target: $(".trpHeaderTitle")[0],
          placement: "bottom",
          showCTAButton: true,
          ctaLabel: 'Skip the tour',
          onCTA: function() {
            if(hopscotch.getCurrStepNum() === 0) {
              hopscotch.endTour();
            }
          }
        },
        {
         title: "Find People",
         content: "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. ",
         target: $("#home-add-people img")[0],
         placement: "top",
         showSkip: true,
         showCTAButton: true,
         ctaLabel: 'Find your connections',
         onCTA: function() {
          if(hopscotch.getCurrStepNum() === 1) {
            window.location.assign('#|connect');
            hopscotch.nextStep();
          }
         }
        },
        {
          title: "My Header",
          content: "Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Type in an email address and press ENTER.",
          target: $("#share-form input")[0],
          placement: "left",
          onShow: function() {
            $("#share-form input").on('keydown', function(e) {
              if(e.keyCode == 13) {
                if(hopscotch.getCurrStepNum() === 2) {
                  hopscotch.nextStep();
                }
              }
            });
          }
        },
        {
          title: "Now send your invitations",
          content: "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Click the invite button",
          target: "submit-button",
          nextOnTargetClick: true,
          placement: "left"
        },
        {
          title: "All done!",
          content: "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut la. Now wait for your friends to respond.",
          target: "finished-button",
          placement: "left"
        }
      ]
    }
  };

  var error = false;
  hopscotch.listen('error', function() {
    if(error) return;
    var step = hopscotch.getCurrStepNum();
    error = true;

    window.setTimeout(function() {
      error = false;
      hopscotch.showStep(step);
    }, 100);
  });


  return {
    start: function(tour) {
      // Start the tour!
      hopscotch.startTour(tours[tour]);
    }
  };


});