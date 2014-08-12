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

var chatWrapper = syncHandlebars.compile('<div class="chat-item model-id-{{id}} {{burstClass}} {{unreadClass}} {{deletedClass}}">{{{inner}}}</div>');

var baseDir = path.normalize(__dirname + '/../../' + nconf.get('web:staticContent'));

function compileTemplate (file) {
  var buffer = fs.readFileSync(baseDir + '/js/views/chat/tmpl/' + file);
  return syncHandlebars.compile(buffer.toString());
}

var chatItemTemplate = compileTemplate('chatItemView.hbs');
var statusItemTemplate = compileTemplate('statusItemView.hbs');

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
  trello:     'https://trello.com/favicon.ico',
  gitter:     'https://gitter.im/images/favicon5.png'
};

var webhookTemplates = ['bitbucket', 'generic', 'github', 'jenkins', 'sprintly', 'travis', 'trello', 'gitter'].reduce(function(memo, v) {
  var chatTemplateFile = baseDir + '/js/views/chat/decorators/tmpl/' + v + '.hbs';
  var buffer = fs.readFileSync(chatTemplateFile);
  var template = syncHandlebars.compile(buffer.toString());

  memo[v] = template;
  return memo;
}, {});


module.exports = exports = function(model, params) {
  var hash = params.hash;
  var lang = hash && hash.lang;
  var locale = hash && hash.locale;
  var displayName;
  var username;
  var deletedClass;


  //data.readByText = this.getReadByText(data.readBy);
  //
  var webhookClass;
  var meta = model.meta;
  var text = model.text;
  var html = model.html || model.text;

  // Handle empty messages as deleted
  if (html.length === 0) {
    html = '<i>This message was deleted</i>';
    deletedClass = 'deleted';
  }

  if(meta && meta.type === 'webhook') {
    var overrides = {
      favicon: favicons[meta.service],
      baseUri: nconf.get('web:basepath')
    };


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
    username: username = model.fromUser && model.fromUser.username,
    text: text,
    html: html,
    lang: lang,
    locale: locale,
    webhookClass: webhookClass
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
