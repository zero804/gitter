"use strict";

var _                   = require('underscore');
var compileTemplate     = require('./compile-web-template');
var activityDecorators  = require('../../shared/activity/activity-decorators');
var prerenderWrapper    = require('./prerender-wrapper');

function compile(template) {
  return compileTemplate('/js/views/righttoolbar/tmpl/' + template + '.hbs');
}

var compositeTemplate   = compile('activity-composite');
var prerenderedTemplate = compile('activity-item-prerendered');

var serviceTemplates = {
  bitbucket:  compile('bitbucket'),
  huboard:    compile('huboard'),
  jenkins:    compile('jenkins'),
  travis:     compile('travis'),
  sprintly:   compile('sprintly'),
  trello:     compile('trello'),
};

var githubTemplates = {
  push:           compile('githubPush'),
  issues:         compile('githubIssues'),
  issue_comment:  compile('githubIssueComment'),
  commit_comment: compile('githubCommitComment'),
  pull_request:   compile('githubPullRequest'),
  gollum:         compile('githubGollum'),
  fork:           compile('githubFork'),
  member:         compile('githubMember'),
  public:         compile('githubPublic'),
  watch:          compile('githubWatch')
};

function renderItem(model) {
  var meta = model.meta;
  var service = meta.service;
  var template;

  // select template
  if (service === 'github') {
    var event = meta.event;
    template = githubTemplates[event];
  } else {
    if (!meta.prerendered) template = serviceTemplates[service];
  }

  if (!template) template = prerenderedTemplate;

  // template data
  var templateData = {
    meta: meta,
    payload: model.payload,
    sent: model.sent,
    html: model.html
  };

  /* Add extra details for non-prerendered */
  if (!meta.prerendered) {
    var extra = activityDecorators(meta, model.payload);
    _.extend(templateData, extra);
  }

  var inner = template(templateData);

  return prerenderWrapper({
    className: "model-id-" + model.id,
    wrap: "li",
    inner: inner
  });
}

function wrapContent(inner, options) {
  var hash = options.hash;

  var wrap = hash.wrap;
  if (!wrap) return inner;

  var className = hash.className;
  var id = hash.id;

  return prerenderWrapper({
    className: className,
    id: id,
    wrap: wrap,
    inner: inner
  });
}

module.exports = function renderCollection(collection, options) {
  var innerContent = collection ? collection.map(renderItem).join('') : '';

  return wrapContent(compositeTemplate({
    _prerender_inner: innerContent
  }), options);
};
