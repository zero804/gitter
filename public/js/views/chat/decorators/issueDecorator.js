/* jshint unused:strict, browser:true, strict:true */
/* global define:false */
define([
  'jquery',
  'backbone',
  'utils/context',
  'views/popover',
  'hbs!./tmpl/issuePopover',
  'hbs!./tmpl/issuePopoverTitle',
], function($, Backbone, context, Popover, issuePopoverTemplate, issuePopoverTitleTemplate) {
  "use strict";

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

  function preparePopover($issue, url, placement) {
    $.get(url, function(issue) {
      if(!issue.state) return;

      // dont change the issue state colouring for the activity feed
      if(!$issue.hasClass('open') && !$issue.hasClass('closed')) {
        $issue.addClass(issue.state);
      }

      var TitleView = Backbone.View.extend({
        render: function() {
          this.$el.html(issuePopoverTitleTemplate(issue));
          return this;
        }
      });

      var View = Backbone.View.extend({
        render: function() {
          this.$el.html(issuePopoverTemplate({
            user: issue.user,
            body_html: issue.body_html,
            date: moment(issue.created_at).format("LLL"),
            assignee: issue.assignee
          }));
          return this;
        }
      });

      var pop = new Popover({
        titleView: new TitleView(),
        view: new View(),
        targetElement: $issue[0]
      });


      makePopoverStayOnHover($issue, pop);
    }).fail(function(error) {
      if(error.status === 404) {
        plaintextify($issue);
      }
    });
  }

  function makePopoverStayOnHover($issue, pop) {
    $issue.on('mouseenter', function() {
      pop.show();
    });
    $issue.on('mouseleave', function() {
      var $popover = pop.$el;
      if($popover.is(':hover')) {
        $popover.one('mouseleave', function() {
          pop.hide();
        });
      } else {
        pop.hide();
      }
    });
  }

  var decorator = {

    decorate: function(chatItemView, options) {
      options = options || {};

      var roomRepo = getRoomRepo();

      chatItemView.$el.find('*[data-link-type="issue"]').each(function() {
        var $issue = $(this);

        var repo = this.dataset.issueRepo || roomRepo;
        var issueNumber = this.dataset.issue;

        if(!repo || !issueNumber) {
          // this aint no issue I ever saw
          plaintextify($issue);
        } else {
          this.target = "github";

          var href = $issue.attr('href');
          if(!href || href === '#') {
            $issue.attr('href', 'https://github.com/'+repo+'/issues/'+issueNumber);
          }

          if(repo.toLowerCase() === roomRepo.toLowerCase()) {
            preparePopover($issue,'/api/v1/troupes/'+context.getTroupeId()+'/issues/'+issueNumber, options.placement);
          } else {
            preparePopover($issue,'/api/private/gh/repos/'+repo+'/issues/'+issueNumber, options.placement);
          }
        }
      });

    }

  };

  return decorator;

});
