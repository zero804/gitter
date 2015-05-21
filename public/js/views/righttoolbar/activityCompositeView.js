"use strict";
var _ = require('underscore');
var Marionette = require('backbone.marionette');
var appEvents = require('utils/appevents');
var issueDecorator = require('views/chat/decorators/issueDecorator');
var commitDecorator = require('views/chat/decorators/commitDecorator');
var mentionDecorator = require('views/chat/decorators/mentionDecorator');
var log = require('utils/log');
var githubPushTemplate = require('./tmpl/githubPush.hbs');
var githubIssuesTemplate = require('./tmpl/githubIssues.hbs');
var githubIssueCommentTemplate = require('./tmpl/githubIssueComment.hbs');
var githubCommitCommentTemplate = require('./tmpl/githubCommitComment.hbs');
var githubPullRequestTemplate = require('./tmpl/githubPullRequest.hbs');
var githubGollumTemplate = require('./tmpl/githubGollum.hbs');
var githubForkTemplate = require('./tmpl/githubFork.hbs');
var githubMemberTemplate = require('./tmpl/githubMember.hbs');
var githubPublicTemplate = require('./tmpl/githubPublic.hbs');
var githubWatchTemplate = require('./tmpl/githubWatch.hbs');
var bitbucketTemplate = require('./tmpl/bitbucket.hbs');
var huboardTemplate = require('./tmpl/huboard.hbs');
var jenkinsTemplate = require('./tmpl/jenkins.hbs');
var travisTemplate = require('./tmpl/travis.hbs');
var sprintlyTemplate = require('./tmpl/sprintly.hbs');
var trelloTemplate = require('./tmpl/trello.hbs');
var prerenderedTemplate = require('./tmpl/activity-item-prerendered.hbs');
var activityTemplate = require('./tmpl/activity-composite.hbs');
var activityEmptyTemplate = require('./tmpl/activity-empty.hbs');
var activityDecorators = require('shared/activity/activity-decorators');
var context = require('utils/context');

require('views/widgets/timeago');
require('views/behaviors/widgets');

module.exports = (function() {

  var serviceTemplates = {
    bitbucket:  bitbucketTemplate,
    huboard:    huboardTemplate,
    jenkins:    jenkinsTemplate,
    travis:     travisTemplate,
    sprintly:   sprintlyTemplate,
    trello:     trelloTemplate
  };

  var githubTemplates = {
    push:           githubPushTemplate,
    issues:         githubIssuesTemplate,
    issue_comment:  githubIssueCommentTemplate,
    commit_comment: githubCommitCommentTemplate,
    pull_request:   githubPullRequestTemplate,
    gollum:         githubGollumTemplate,
    fork:           githubForkTemplate,
    member:         githubMemberTemplate,
    public:         githubPublicTemplate,
    watch:          githubWatchTemplate
  };


  var ActivityItemView = Marionette.ItemView.extend({
    tagName: 'li',
    modelEvents: {
      change: 'render'
    },
    behaviors: {
      Widgets: {}
    },
    initialize: function() {
      var meta = this.model.get('meta');
      var service = meta.service;

      if (service == 'github') {
        var event = meta.event;
        this.template = githubTemplates[event];
      } else {
        if(!meta.prerendered) {
          this.template = serviceTemplates[service];
        } else {
          this.template = prerenderedTemplate;
        }
      }
    },

    serializeData: function() {
      try {
        var meta    = this.model.get('meta');
        var payload = this.model.get('payload');
        var sent    = this.model.get('sent');
        var html    = this.model.get('html');

        var core = {
          meta: meta,
          payload: payload,
          sent: sent,
          html: html
        };

        var extra = meta.prerendered ? {} : activityDecorators(meta, payload);
        return _.extend(core, extra);
      } catch (e) {
        var modelData = this.model && this.model.attributes;
        appEvents.trigger('bugreport', e, { extra: modelData });
        log.info('ERROR rendering activity item:', e.message, e.stack, modelData);
        return {};
      }
    },

    onRender: function() {
      issueDecorator.decorate(this);
      commitDecorator.decorate(this);
      mentionDecorator.decorate(this);
    }
  });

  var ActivityEmptyItemView = Marionette.ItemView.extend({
    tagName: 'li',
    className: 'activity-tip',
    template: activityEmptyTemplate,
    serializeData: function() {
      var isNativeDesktopApp = context().isNativeDesktopApp;
      var integrationsUrl = (isNativeDesktopApp ? '/' + context.troupe().get('url') : '') + '#integrations';

      return {
        integrationsUrl: integrationsUrl,
        isNativeDesktopApp: isNativeDesktopApp
      };
    }
  });

  var ActivityView = Marionette.CompositeView.extend({
    template: activityTemplate,
    childViewContainer: '#activity-list',
    childView: ActivityItemView,
    childViewOptions: function(item) {
      if(item && item.id) {
        // This allows the chat collection view to bind to an existing element...
        var e = this.$el.find('.model-id-' + item.id)[0];
        if(e) return { el: e };
      }
    },
    getEmptyView: function() {
      // Admins see "Configure your integrations" empty
      if (context().permissions.admin) return ActivityEmptyItemView;
    },
    ui: {
      header: '#activity-header'
    },
    collectionEvents: {
      'add reset sync reset': '_showHideHeader'
    },
    onRender: function() {
      this._showHideHeader();
    },
    _showHideHeader: function() {
      // Admins see the header when the collection is empty
      // so that they get to
      var headerVisible = !!(context().permissions.admin || this.collection.length);
      this.ui.header.toggle(headerVisible);
    },
    _renderTemplate: function() {
      var data = {};
      data = this.serializeData();
      data = this.mixinTemplateHelpers(data);

      this.triggerMethod('before:render:template');

      var template = this.getTemplate();
      if (template !== false) {
        var html = Marionette.Renderer.render(template, data, this);
        this.attachElContent(html);
      }

      // the ui bindings is done here and not at the end of render since they
      // will not be available until after the model is rendered, but should be
      // available before the collection is rendered.
      this.bindUIElements();
      this.triggerMethod('render:template');
    }
  });


  return ActivityView;

})();
