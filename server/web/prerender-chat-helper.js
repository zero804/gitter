"use strict";

/* Would be nice if we could just fold this into prerender-helper, but at the moment
 * async helpers for express-hbs only take a single parameter and we can't use them
 * Also, this way is much faster, so it's not so bad
 */

var compileTemplate = require('./compile-web-template');
var _               = require('lodash');

var chatWrapper = compileTemplate.compileString('<div class="chat-item model-id-{{id}} {{burstClass}} {{unreadClass}} {{deletedClass}}">{{{inner}}}</div>');

var chatItemTemplate = compileTemplate('/js/views/chat/tmpl/chatItemView.hbs');
var statusItemTemplate = compileTemplate('/js/views/chat/tmpl/statusItemView.hbs');
var timeFormat = require('gitter-web-shared/time/time-format');
// var fullTimeFormat = require('gitter-web-shared/time/full-time-format');

function getFormattedTime(model, lang, tz, tzOffset, showDatesWithoutTimezone) {
  /* In the chat environment, we don't want to prerender the time
   * when we don't know what timezone the user is in: we'll just wait
   * until the javascript kicks in and render it then.
   *
   * However, in the archive environment, we don't want to do this
   * for SEO and also because the chats are not re-rendered, so no
   * times will be shown.
   */
  if (!tz && !showDatesWithoutTimezone) {
    return '';
  }

  return timeFormat(model.sent, { lang: lang, tzOffset: tzOffset });
}

module.exports = exports = function(model, params) {
  var deletedClass;

  var root = params.data.root;

  var lang = root.lang;
  var locale = root.locale;
  var tz = root.tz;
  var tzOffset = root.tzOffset;
  var showDatesWithoutTimezone = root.showDatesWithoutTimezone;

  var text = model.text;
  var html = model.html || model.text;

  // Handle empty messages as deleted
  if (html.length === 0) {
    html = '<i>This message was deleted</i>';
    deletedClass = 'deleted';
  }

  var sentTimeFormatted = getFormattedTime(model, lang, tz, tzOffset, showDatesWithoutTimezone);
  // TODO: add permalinkUrl and sentTimeFull

  var m = _.extend({}, model, {
    displayName: model.fromUser && model.fromUser.displayName,
    username: model.fromUser && model.fromUser.username,
    sentTimeFormatted: sentTimeFormatted,
    text: text,
    html: html,
    lang: lang,
    locale: locale,
    tz: tz,
    tzOffset: tzOffset,
    showDatesWithoutTimezone: showDatesWithoutTimezone
  });

  var result;

  if (m.status) {
    result = statusItemTemplate(m);
  } else {
    result = chatItemTemplate(m);
  }

  var unreadClass = model.unread ? 'unread' : 'read';
  var burstClass = model.burstStart ? 'burstStart' : 'burstContinued';

  return chatWrapper({
    id: model.id,
    burstClass: burstClass,
    unreadClass: unreadClass,
    deletedClass: deletedClass,
    locale: locale,
    inner: result
  });
};
