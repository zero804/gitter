/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var timeFormat = require('../../../shared/time/time-format');

module.exports = exports = function() {
  return function timeagoWidgetHandler(params) {
    var options = params.hash;
    var root = params.data.root;

    var time, lang, compact, alwaysShow;

    if (options) {
      time = options.time;
      lang = options.lang;
      compact = options.compact;
    }

    var tzOffset = root.tzOffset;
    var tz = root.tz;
    var alwaysShow = root.showDatesWithoutTimezone;

    /* In the chat environment, we don't want to prerender the time
     * when we don't know what timezone the user is in: we'll just wait
     * until the javascript kicks in and render it then.
     *
     * However, in the archive environment, we don't want to do this
     * for SEO and also because the chats are not re-rendered, so no
     * times will be shown.
     */
    if (!tz && !alwaysShow) {
      return '';
    }

    return timeFormat(time, { lang: lang, tzOffset: tzOffset, compact: compact });
  };
};
