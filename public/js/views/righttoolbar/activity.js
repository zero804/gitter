"use strict";
var $ = require('jquery');
var _ = require('underscore');
var Marionette = require('marionette');
var appEvents = require('utils/appevents');
var TroupeViews = require('views/base');
var issueDecorator = require('views/chat/decorators/issueDecorator');
var commitDecorator = require('views/chat/decorators/commitDecorator');
var mentionDecorator = require('views/chat/decorators/mentionDecorator');
var log = require('utils/log');
var context = require('utils/context');
var activityTipTemplate = require('./tmpl/activity-tip.hbs');
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
var prerenderedTemplate = require('./tmpl/prerendered.hbs');
var cocktail = require('cocktail');
var compositeTemplate = require('./tmpl/composite.hbs');


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

  var decorators = {
    trello: function(meta, payload) {
      var trello_actions = {
        updateCard:   'updated',
        createCard:   'created',
        commentCard:  'commented',
        voteOnCard:   'voted',
      };
      return {trello_action: trello_actions[payload.action.type]};
    },
    sprintly: function(meta, payload) {
      var extra = {};

      if (payload.model == "Item") {
        extra.sprintly_action = "created";
      } else if (payload.model == "Comment") {
        extra.sprintly_action = "commented on";
      }
      return extra;
    },
    bitbucket: function(meta) {
      // meta.commits is undefined for empty arrays in old hooks.
      // this is because of issue #233 (form encoding was removing empty arrays)
      var commits = meta.commits || [];
      return {
        first_commit: commits[0],
        is_single_commit: commits.length === 1,
        commits_count: commits.length
      };
    },
    github: function(meta, payload) {
      var extra = {};

      if (meta.event == 'push') {
        // if you push a tag, then commits is undefined
        var commits = payload.commits || [];
        var commitCount = commits.length;

        extra.commits = commits;
        extra.commits.forEach(function(commit){
          commit.short_sha = commit.id.substring(0,7);
          var message = commit.message;
          commit.short_message = (message.length > 32) ? message.substr(0,31) + '…' : message;
        });

        if(commitCount > 3) {
          extra.commits = extra.commits.slice(0,3);
          extra.hidden_commit_count = commitCount - 3;
        }

        extra.commits_count = commitCount;

      } else if (meta.event == 'gollum') {
        extra.wiki_url = payload.pages[0].html_url;
        extra.wiki_page = payload.pages[0].page_name;
      } else if (meta.event === 'commit_comment') {
        // fall back to payload data for old hooks
        extra.commit = meta.commit || {
          id: payload.comment.commit_id,
          short_sha: payload.comment.commit_id.substring(0,7),
        };
      }
      return extra;
    },
    jenkins: function(meta, payload) {
      var status = payload.build.status ? payload.build.status.toLowerCase() : payload.build.phase.toLowerCase();
      return { build_status: status };
    },
    travis: function(meta, payload) {
      var extra = {};
      var status = payload.status_message ? payload.status_message.toLowerCase() : '';
      extra.build_status = (status === 'still failing') ? 'failing' : status;
      return extra;
    },
    huboard: function(meta) {
      var extra = {};
      var column = meta.column;
      var previousColumn = meta.previousColumn;

      if(meta.milestone) {
        extra.context = 'to '+meta.milestone;
      } else if(meta.status) {
        extra.context = 'to '+meta.status;
      } else if(column) {
        extra.context = previousColumn ? 'from '+previousColumn+' to '+column : 'in '+column;
      }
      return extra;
    }
  };

  function getExtraRenderData(meta, payload) {
    var decorator = decorators[meta.service];
    var extra = decorator ? decorator(meta, payload) : {};

    // Support branch names with slashes, ie: develop/feature/123-foo
    if (payload && payload.ref) {
      var refs = payload.ref.split('/');
      extra.branch_name = refs[3] ? refs[3] : refs[2];
      extra.repo = payload.repository.owner.name + '/' + payload.repository.name;
    }

    return extra;
  }



  var ActivityItemView = Marionette.ItemView.extend({
    tagName: 'li',
    modelEvents: {
      change: 'render'
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
      try{
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

        var extra = meta.prerendered ? {} : getExtraRenderData(meta, payload);
        return _.extend(core, extra);
      } catch(e) {
        var modelData = this.model && this.model.attributes;
        appEvents.trigger('bugreport', e, { extra: modelData });
        log('ERROR rendering activity item:', e.message, e.stack, modelData);
        return {};
      }
    },

    onRender: function() {
      issueDecorator.decorate(this);
      commitDecorator.decorate(this);
      mentionDecorator.decorate(this);
    }
  });

  var EmptyActivityView = Marionette.ItemView.extend({
    id: 'activity-tip',
    template: activityTipTemplate,
    serializeData: function() {
      return {
        isAdmin: context().permissions.admin,
        isNativeDesktopApp: context().isNativeDesktopApp,
        integrationsUrl: context().isNativeDesktopApp ? window.location.origin + '/' + context.troupe().get('uri') + '#integrations' : '#integrations'
      };
    }
  });

  var ActivityView = Marionette.CompositeView.extend({
    template: compositeTemplate,
    itemViewContainer: 'ul',

    initialize: function() {
      this.listenTo(this.collection, 'snapshot', this.render);
    },

    itemView: ActivityItemView,
    emptyView: EmptyActivityView
  });
  cocktail.mixin(ActivityView, TroupeViews.SortableMarionetteView);

  return ActivityView;


})();

