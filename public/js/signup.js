require([
  'jquery',
  'jquery-carousel'
 ],
  function($, carousel) {
    "use strict";

    require([
      'utils/tracking'
    ], function() {
      // No need to do anything here
    });

    $('#carousel').carouFredSel({
        circular: true,         // Determines whether the carousel should be circular.
        infinite: true,         // Determines whether the carousel should be infinite. Note: It is possible to create a non-circular, infinite carousel, but it is not possible to create a circular, non-infinite carousel.
        responsive: true,       // Determines whether the carousel should be responsive. If true, the items will be resized to fill the carousel.
        direction: "left",      // The direction to scroll the carousel. Possible values: "right", "left", "up" or "down".
        width: null,            // The width of the carousel. Can be null (width will be calculated), a number, "variable" (automatically resize the carousel when scrolling items with variable widths), "auto" (measure the widest item) or a percentage like "100%" (only applies on horizontal carousels)
        height: null,           // The height of the carousel. Can be null (width will be calculated), a number, "variable" (automatically resize the carousel when scrolling items with variable heights), "auto" (measure the tallest item) or a percentage like "100%" (only applies on vertical carousels)
        align: "center",        // Whether and how to align the items inside a fixed width/height. Possible values: "center", "left", "right" or false.
        padding: null,          // Padding around the carousel (top, right, bottom and left). For example: [10, 20, 30, 40] (top, right, bottom, left) or [0, 50] (top/bottom, left/right).
        synchronise: null,      // Selector and options for the carousel to synchronise: [string selector, boolean inheritOptions, boolean sameDirection, number deviation] For example: ["#foo2", true, true, 0]
        cookie: false,          // Determines whether the carousel should start at its last viewed position. The cookie is stored until the browser is closed. Can be a string to set a specific name for the cookie to prevent multiple carousels from using the same cookie.
        onCreate: null,          // Function that will be called after the carousel has been created. Receives a map of all data.
        auto: false,
        next: ".next",
        prev: "#back-button",
        pagination: {
            container: "#pager",
            anchorBuilder: false
        },
        debug: false
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



