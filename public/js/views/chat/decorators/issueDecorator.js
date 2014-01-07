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
      chatItemView.$el.find('*[data-link-type="issue"]').each(function() {
        var issueNumber = this.dataset.issue;
        var $issue = $(this);

        this.target = "github";
        this.href = "https://github.com/" + context.troupe().get('uri') + "/issues/" + issueNumber;

        var url = '/api/v1/troupes/' + context.getTroupeId() + '/issues/' + issueNumber;
        $.get(url, function(issue) {
          if(!issue.state) return;
          var description = issue.body;

          // css elipsis overflow cant handle multiline text
          var shortDescription = (description && description.length > 250) ? description.substring(0,250)+'…' : description;

          $issue.removeClass('open closed').addClass(issue.state);
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
            $issue.replaceWith('#'+issueNumber);
          }
        });
      });

    }

  };

  return decorator;

});
