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

    $('.scroll-link').click(function(){
    $('html, body').animate({
        scrollTop: $( $.attr(this, 'href') ).offset().top
    }, 500);
    return false;
    });


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



