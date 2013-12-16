/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

/* Would be nice if we could just fold this into prerender-helper, but at the moment
 * async helpers for express-hbs only take a single parameter and we can't use them
 * Also, this way is much faster, so it's not so bad
 */

var nconf      = require('../utils/config');
var path       = require('path');
var fs         = require('fs');
var _          = require('underscore');
var syncHandlebars = require('handlebars');
var widgetHelpers = require('./widget-prerenderers');

var templateFile = path.normalize(__dirname + '/../../' + nconf.get('web:staticContent') + '/js/views/chat/tmpl/chatViewItem.hbs');
var buffer = fs.readFileSync(templateFile);
var chatItemTemplate = syncHandlebars.compile(buffer.toString());

module.exports = exports = function(model) {

  var displayName;

  //data.readByText = this.getReadByText(data.readBy);

  var m = _.extend({
    displayName: displayName = model.fromUser && model.fromUser.displayName
  }, model, widgetHelpers);
  var result = chatItemTemplate(m);

  result = '<div class="trpChatItemContainer model-id-' + model.id + '">' + result + '</div>';

  return result;
};
