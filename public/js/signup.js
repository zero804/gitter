require([
  'jquery'
 ],
  function($) {
    "use strict";

    require([
      'utils/tracking'
    ], function() {
      // No need to do anything here
    });

    // stuff to cycle various things
    function cycle(el, speed) {
      el.first().addClass('visible');

      el.parent().css('height', el.outerHeight());

      setInterval(function() {
        var active = el.filter('.visible').removeClass('visible').addClass('going');
        var target = active.next();

        if(!target.length) {
          target = el.first();
        }

        target.removeClass('going').addClass('visible');
      }, speed || 4000);
    }

    // stuff to animate apps area on scroll
    function appsPanel() {
      var pos = $('#apps-panel').position().top;
      var win = $(window);
      var offset = 150;

      win.scroll(function() {
        if(win.scrollTop() + offset >= pos) {
          $('#apps-panel').addClass('visible');
        }
      });
    }

    // INITIALISE THE THINGS

    cycle($('#testimonials-panel blockquote'));
    cycle($('.loves li'), 2500);
    appsPanel();

    $('#intro-panel > .bg').fadeIn(800);


    $('#arrow-1').click(function() {
        if (window.mixpanel) {
            window.mixpanel.track('arrow-click', { arrow: 'arrow-1' });
        }
    });
    $('#arrow-2').click(function() {
        if (window.mixpanel) {
            window.mixpanel.track('arrow-click', { arrow: 'arrow-2' });
        }
    });

});



