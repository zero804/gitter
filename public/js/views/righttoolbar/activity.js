/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'marionette',
  'utils/context',
  'views/base',
  'log!activity',
  'hbs!./tmpl/activityStream',

  'hbs!./tmpl/githubPush',
  'hbs!./tmpl/githubIssues',
  'hbs!./tmpl/githubIssueComment',
  'hbs!./tmpl/githubCommitComment',
  'hbs!./tmpl/githubPullRequest',
  'hbs!./tmpl/githubGollum',
  'hbs!./tmpl/githubFork',
  'hbs!./tmpl/githubMember',
  'hbs!./tmpl/githubPublic',
  'hbs!./tmpl/githubWatch',

  'hbs!./tmpl/bitbucket',
  'hbs!./tmpl/jenkins',
  'hbs!./tmpl/travis',
  'hbs!./tmpl/sprintly',
  'hbs!./tmpl/trello',

  'cocktail'
], function(
  Marionette, 
  context,
  TroupeViews, 
  log,
  activityStreamTemplate, 

  githubPushTemplate,
  githubIssuesTemplate,
  githubIssueCommentTemplate,
  githubCommitCommentTemplate,
  githubPullRequestTemplate,
  githubGollumTemplate,
  githubForkTemplate,
  githubMemberTemplate,
  githubPublicTemplate,
  githubWatchTemplate,

  bitbucketTemplate,
  jenkinsTemplate,
  travisTemplate,
  sprintlyTemplate,
  trelloTemplate,

  cocktail
) {
  "use strict";

  var ActivityItemView = TroupeViews.Base.extend({
    tagName: 'li',

    initialize: function(/*options*/) {
      this.setRerenderOnChange();

      var serviceTemplates = {
        bitbucket:  bitbucketTemplate,
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

      var service = this.model.get('meta').service;
      if (service == 'github') {
        var event = this.model.get('meta').event;
        this.template = githubTemplates[event];
      } else {
        this.template = serviceTemplates[service];
      }
    },

    getRenderData: function() {
      var meta    = this.model.get('meta');
      var payload = this.model.get('payload');

      if (meta.service == 'trello') {
        var trello_actions = {
          updateCard:   'updated',
          createCard:   'created',
          commentCard:  'commented',
          voteOnCard:   'voted',
        };

        var trello_action = trello_actions[payload.action.type];
      }

      // Support branch names with slashes, ie: develop/feature/123-foo
      if (payload.ref) {
        var refs = payload.ref.split('/');
        var branch_name = refs[2];
        // if (refs[3]) branch_name += '/' + refs[3];
        if (refs[3]) branch_name = refs[3];
        
        var repo = payload.repository.owner.name + '/' + payload.repository.name;
      }

      if (meta.service == 'github') {
        if (meta.event == 'push') {
          var commits_count = payload.commits ? payload.commits.length : 0;
          if (commits_count > 1) {
            var multiple_commits = true;
          }
          else {
            var commit_text = payload.commits[0].message;
            if (commit_text.length > 34) {
              commit_text = commit_text.substr(0,33) + '...';
            }
          }
        }
        if (meta.event == 'gollum') {
          var wiki_url = payload.pages[0].html_url;
          var wiki_page = payload.pages[0].page_name;
        }
      }


      // TODO: Double check all of these attrs can be lowercased
      var build_status;
      if (meta.service == 'jenkins') {
        build_status = payload.build.status ? payload.build.status.toLowerCase() : payload.build.phase.toLowerCase();
      }
      if (meta.service == 'travis') {
        build_status = payload.status_message ? payload.status_message.toLowerCase() : '';
        if (build_status == 'still failing') build_status = 'failing';
      }

      // log(JSON.stringify(payload));

      return {
        meta:           meta,
        payload:        payload,
        commits_count:  commits_count,
        branch_name:    branch_name,
        repo:           repo,
        trello_action:  trello_action,
        build_status:   build_status,
        multiple_commits: multiple_commits,
        commit_text: commit_text,
        wiki_url: wiki_url,
        wiki_page: wiki_page,
      }
    }
  });

  var ItemsView = Marionette.CollectionView.extend({
    tagName: 'ul',
    className: 'gtrActivityList'
  });
  cocktail.mixin(ItemsView, TroupeViews.SortableMarionetteView);

  var ActivityView = TroupeViews.Base.extend({
    template: activityStreamTemplate,

    initialize: function(/*options*/) {
      this.data = {};
      this.collectionView = new ItemsView({
         collection: this.collection,
        itemView: ActivityItemView
      });
    },

    afterRender: function() {
      this.$el.find('.events').append(this.collectionView.render().el);
    }
  });

  
  return ActivityView;

});
