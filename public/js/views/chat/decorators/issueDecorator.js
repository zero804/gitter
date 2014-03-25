/* jshint unused:strict, browser:true, strict:true */
/* global define:false */
define([
  'jquery',
  'backbone',
  'marionette',
  'underscore',
  'utils/context',
  'utils/appevents',
  'views/popover',
  'hbs!./tmpl/issuePopover',
  'hbs!./tmpl/issuePopoverTitle',
  'hbs!./tmpl/commitPopoverFooter'
], function($, Backbone, Marionette, _, context, appEvents, Popover, bodyTemplate, titleTemplate, footerTemplate) {
  "use strict";

  var BodyView = Marionette.ItemView.extend({
    className: 'issue-popover-body',
    template: bodyTemplate,
    modelEvents: {
      change: 'render'
    },
    serializeData: function() {
      var data = this.model.toJSON();
      data.date = moment(data.created_at).format("LLL");
      return data;
    }
  });

  var TitleView = Marionette.ItemView.extend({
    modelEvents: {
      change: 'render'
    },
    template: titleTemplate
  });

  var FooterView = Backbone.View.extend({
    className: 'commit-popover-footer',
    template: footerTemplate,
    events: {
      'click button.mention': 'onMentionClick'
    },
    modelEvents: {
      change: 'render'
    },
    onMentionClick: function() {
      var roomRepo = getRoomRepo();
      var modelRepo = this.model.get('repo');
      var modelNumber = this.model.get('number');
      var mentionText = (modelRepo === roomRepo) ? '#'+modelNumber : modelRepo+'#'+modelNumber;
      appEvents.trigger('input.append', mentionText);
      this.parentPopover.hide();
    }
  });

  function getRoomRepo() {
    var room = context.troupe();
    if(room.get('githubType') === 'REPO') {
      return room.get('uri');
    } else {
      return '';
    }
  }

  function plaintextify($el) {
    $el.replaceWith($el.text());
  }

  function createPopover(model, targetElement) {
    return new Popover({
      titleView: new TitleView({ model: model }),
      view: new BodyView({ model: model }),
      footerView: new FooterView({ model: model }),
      targetElement: targetElement,
      placement: 'horizontal'
    });
  }

  var queryIssues = [];
  var throttledQuery = _.throttle(function() {
    if(!queryIssues.length) return;

    // Better caching if sorted
    queryIssues.sort(function(a, b) {
      var sa = a.i;
      var sb = b.i;
      if(sa == sb) return 0;
      return sa < sb ? -1 : 1;
    });

    $.ajax({
      url: '/api/private/issue-state',
      data: queryIssues.map(function(r) { return { name: 'q', value: r.i }; }),
      success: function(states) {
        for(var i = 0; i < queryIssues.length; i++) {
          var state = states[i];
          queryIssues[i].callback(state);
        }
      }
    });
    queryIssues = [];
  }, 100);

  function addIssue(repo, issueNumber, callback) {
    queryIssues.push({ i: repo + '/' + issueNumber, callback: callback });
    throttledQuery();
  }

  var IssueModel = Backbone.Model.extend({
    idAttribute: "number",
    urlRoot: function() {
      var repo = this.get('repo');
      return '/api/private/gh/repos/' + repo + '/issues/';
    }
  });

  var decorator = {

    decorate: function(view) {
      var roomRepo = getRoomRepo();

      view.$el.find('*[data-link-type="issue"]').each(function() {
        var $issue = $(this);

        var repo = $issue.data('issueRepo') || roomRepo;
        var issueNumber = $issue.data('issue');

        addIssue(repo, issueNumber, function(state) {
          // dont change the issue state colouring for the activity feed
          if(!$issue.hasClass('open') && !$issue.hasClass('closed')) {
            $issue.addClass(state);
          }
        });

        function showPopover(e) {
          var model = new IssueModel({ repo: repo, number: issueNumber });
          model.fetch({ data: { renderMarkdown: true } });

          var popover = createPopover(model, e.target);
          popover.show();
          Popover.singleton(view, popover);
        }

        function showPopoverLater(e) {
          Popover.hoverTimeout(e, function() {
            showPopover(e);
          });
        }

        $issue.on('click', showPopover);
        $issue.on('mouseover', showPopoverLater);

        view.addCleanup(function() {
          $issue.off('click', showPopover);
          $issue.off('mouseover', showPopoverLater);
        });

        // if(!repo || !issueNumber) {
        //   // this aint no issue I ever saw
        //   plaintextify($issue);
        //   return;
        // }

        // var url = '/api/private/gh/repos/'+repo+'/issues/'+issueNumber+'?renderMarkdown=true';

        // $.get(url, function(issue) {

        //   function showPopover(e) {
        //     var popover = createPopover(model, e.target);
        //     popover.show();
        //     Popover.singleton(view, popover);
        //   }

        //   function showPopoverLater(e) {
        //     Popover.hoverTimeout(e, function() {
        //       var popover = createPopover(model, e.target);
        //       popover.show();
        //       Popover.singleton(view, popover);
        //     });
        //   }

        //   // dont change the issue state colouring for the activity feed
        //   if(!$issue.hasClass('open') && !$issue.hasClass('closed')) {
        //     $issue.addClass(issue.state);
        //   }

        //   var model = new Backbone.Model(issue);
        //   model.set('date', moment(issue.created_at).format("LLL"));
        //   model.set('repo', repo);

        //   $issue.on('click', showPopover);
        //   $issue.on('mouseover', showPopoverLater);

        //   view.addCleanup(function() {
        //     $issue.off('click', showPopover);
        //     $issue.off('mouseover', showPopoverLater);
        //   });

        // }).fail(function(error) {
        //   if(error.status === 404) {
        //     plaintextify($issue);
        //   }
        // });
      });
    }
  };

  return decorator;

});
