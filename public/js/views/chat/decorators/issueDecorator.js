/* jshint unused:strict, browser:true, strict:true */
/* global define:false */
define([
  'jquery',
  'utils/context',
  'hbs!./tmpl/issuePopover',
  'hbs!./tmpl/issuePopoverTitle',
], function($, context, issuePopoverTemplate, issuePopoverTitleTemplate) {
  "use strict";

  var decorator = {

    decorate: function(chatItemView) {
      chatItemView.$el.find('*[data-link-type="issue"]').each(function() {
        var issueNumber = this.dataset.issue;
        var $issue = $(this);

        var url = '/api/v1/troupes/' + context.getTroupeId() + '/issues/' + issueNumber;
        $.get(url, function(issue) {
          if(!issue.state) return;
          var description = issue.body;

          // css elipsis overflow cant handle multiline text
          var shortDescription = (description && description.length > 250) ? description.substring(0,250)+'…' : description;

          $issue.removeClass('open closed').addClass(issue.state);
          $issue.attr('title', issuePopoverTitleTemplate(issue));
          $issue.popover({
            html: true,
            trigger: 'hover',
            placement: 'right',
            container: 'body',
            content: issuePopoverTemplate({
              username: issue.user.login,
              avatarUrl: issue.user.avatar_url,
              description: shortDescription,
              date: moment(issue.created_at).format("LLL"),
              assignee: issue.assignee
            })
          });
        });
      });

    }

  };

  return decorator;

});
