define([
], function () {
  "use strict";

  // Some innovative scrollbar measuring stuff
  function detect() {
    var scrollDiv = document.createElement("div");
    scrollDiv.className = "scrollbar-measure";
    document.body.appendChild(scrollDiv);

    // Get the scrollbar width
    var scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;

    document.body.removeChild(scrollDiv);

    return scrollbarWidth > 0;
  }

  var detected = false;
  var hasScrollBars;

  return function() {
    if(detected) {
      return hasScrollBars;
    }

    detected = true;
    hasScrollBars = detect();
    return hasScrollBars;
  };


});
