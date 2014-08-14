define(['underscore', 'backbone', 'utils/context'], function(_, Backbone, context) {
  "use strict";

  var basePath = context.env('basePath');

  /*
   *
   * This is the new application-wide message bus. Use it instead of jquery $(document).on(...)
   * As we can use Backbone style listenTo() event listening with it
   */
  var appEvents = {
    triggerParent: function() {
      var args = Array.prototype.slice.call(arguments, 0);
      window.parent.postMessage(JSON.stringify({
        child_window_event: args
      }), basePath);
    }
  };

  window.addEventListener("message", function(e) {
    if (e.origin !== basePath) return;
    var data = JSON.parse(e.data);

    if(data.child_window_event) {
      appEvents.trigger.apply(appEvents, data.child_window_event);
    }
  }, false);

  _.extend(appEvents, Backbone.Events);
  return appEvents;

});
