/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

/* Would be nice if we could just fold this into prerender-helper, but at the moment
 * async helpers for express-hbs only take a single parameter and we can't use them
 * Also, this way is much faster, so it's not so bad
 */

var compileTemplate = require('../utils/compile-template');
var _               = require('underscore');
var syncHandlebars  = require('handlebars');
var widgetHelpers   = require('./widget-prerenderers');

var chatWrapper = syncHandlebars.compile('<div class="chat-item model-id-{{id}} {{burstClass}} {{unreadClass}} {{deletedClass}}">{{{inner}}}</div>');

var chatItemTemplate = compileTemplate('/js/views/chat/tmpl/chatItemView.hbs');
var statusItemTemplate = compileTemplate('/js/views/chat/tmpl/statusItemView.hbs');


module.exports = exports = function(model, params) {
  var hash = params.hash;
  var lang = hash && hash.lang;
  var locale = hash && hash.locale;
  var displayName;
  var username;
  var deletedClass;


  //data.readByText = this.getReadByText(data.readBy);
  //
  var text = model.text;
  var html = model.html || model.text;

  // Handle empty messages as deleted
  if (html.length === 0) {
    html = '<i>This message was deleted</i>';
    deletedClass = 'deleted';
  }

  var m = _.extend({}, model, {
    displayName: displayName = model.fromUser && model.fromUser.displayName,
    username: username = model.fromUser && model.fromUser.username,
    text: text,
    html: html,
    lang: lang,
    locale: locale
  }, widgetHelpers);

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
