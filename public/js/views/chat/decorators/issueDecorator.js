/* jshint unused:strict, browser:true, strict:true */
/* global define:false */
define([
  'jquery',
  'underscore',
  'utils/context',
  'hbs!./tmpl/issuePopover',
  'hbs!./tmpl/issuePopoverTitle',
], function($, _, context, issuePopoverTemplate, issuePopoverTitleTemplate) {
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

  function preparePopover($issue, url) {
    $.get(url, function(issue) {
      if(!issue.state) return;
      var description = issue.body;

      // css elipsis overflow cant handle multiline text
      var shortDescription = (description && description.length > 250) ? description.substring(0,250)+'…' : description;

      $issue.removeClass('open closed').addClass(issue.state);
      $issue.attr('title', issuePopoverTitleTemplate(issue));
      $issue.popover({
        html: true,
        trigger: 'manual',
        placement: 'right',
        container: 'body',
        title: issuePopoverTitleTemplate(issue),
        content: issuePopoverTemplate({
          user: issue.user,

          // description should be rendered with markdown, but this will at least safely
          // render escaped characters without xss
          description: _.unescape(shortDescription),
          date: moment(issue.created_at).format("LLL"),
          assignee: issue.assignee
        })
      });
      makePopoverStayOnHover($issue);
    }).fail(function(error) {
      if(error.status === 404) {
        plaintextify($issue);
      }
    });
  }

  function makePopoverStayOnHover($issue) {
    $issue.on('mouseenter', function() {
      $issue.popover('show');
    });
    $issue.on('mouseleave', function() {
      var $popover = $('.popover');
      if($popover.is(':hover')) {
        $popover.one('mouseleave', function() {
          $issue.popover('hide');
        });
      } else {
        $issue.popover('hide');
      }
    });
  }

  var decorator = {

    decorate: function(chatItemView) {
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
          this.href = "https://github.com/"+repo+"/issues/"+issueNumber;

          if(repo.toLowerCase() === roomRepo.toLowerCase()) {
            preparePopover($issue,'/api/v1/troupes/'+context.getTroupeId()+'/issues/'+issueNumber);
          } else {
            preparePopover($issue,'/api/private/github_mirror/repos/'+repo+'/issues/'+issueNumber);
          }
        }
      });

    }

  };

  return decorator;

});
