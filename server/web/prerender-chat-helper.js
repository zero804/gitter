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

var chatWrapper = syncHandlebars.compile('<div class="trpChatItemContainer model-id-{{id}} {{unreadClass}}">{{{inner}}}</div>');

var baseDir = path.normalize(__dirname + '/../../' + nconf.get('web:staticContent'));

var templateFile = baseDir + '/js/views/chat/tmpl/chatViewItem.hbs';
var buffer = fs.readFileSync(templateFile);
var chatItemTemplate = syncHandlebars.compile(buffer.toString());


var human_actions = {
  push:           'pushed',
  issues:         'an issue',
  issue_comment:  'commented on an issue',
  commit_comment: 'commented on a commit',
  pull_request:   'a Pull Request',
  gollum:         'updated the wiki',
  fork:           'forked',
  member:         'as member to',
  public:         'made public',
  watch:          'started watching'
};

var favicons = {
  github:     'https://github.com/favicon.ico',
  bitbucket:  'https://bitbucket.org/favicon.ico',
  jenkins:    'https://jenkins-ci.org/sites/default/files/jenkins_favicon.ico',
  sprintly:   'https://sprint.ly/favicon.ico',
  travis:     'https://travis-ci.org/favicon.ico',
  trello:     'https://trello.com/favicon.ico'
};

var webhookTemplates = ['bitbucket', 'generic', 'github', 'jenkins', 'sprintly', 'travis', 'trello'].reduce(function(memo, v) {
  var templateFile = baseDir + '/js/views/chat/decorators/tmpl/' + v + '.hbs';
  var buffer = fs.readFileSync(templateFile);
  var template = syncHandlebars.compile(buffer.toString());

  memo[v] = template;
  return memo;
}, {});


module.exports = exports = function(model) {

  var displayName;

  //data.readByText = this.getReadByText(data.readBy);
  //
  var webhookClass;
  var meta = model.meta;
  var text = model.text;
  var html = model.html || model.text;

  if(meta && meta.type === 'webhook') {
    var overrides = {};

    overrides.favicon = favicons[meta.service];

    if(meta.service === 'github') {
      overrides.human_action = human_actions[meta.event];
    }

    var template = webhookTemplates[meta.service];
    if(!template) template = webhookTemplates.generic;

    var templateData = _.extend({}, meta, overrides);
    html = new syncHandlebars.SafeString(template(templateData));

    webhookClass = 'webhook';
  }


  var m = _.extend({}, model, {
    displayName: displayName = model.fromUser && model.fromUser.displayName,
    text: text,
    html: html,
    webhookClass: webhookClass
  }, widgetHelpers);

  var result = chatItemTemplate(m);
  var unreadClass = model.unread ? 'unread' : 'read';

  return chatWrapper({
    id: model.id,
    unreadClass: unreadClass,
    inner: result
  });
};
