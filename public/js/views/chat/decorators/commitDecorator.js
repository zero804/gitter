/* jshint unused:strict, browser:true, strict:true */
/* global define:false */
define([
  'jquery',
  'backbone',
  'views/popover',
  'hbs!./tmpl/commitPopover',
  'hbs!./tmpl/commitPopoverTitle',
], function($, Backbone, Popover, commitPopoverTemplate, commitPopoverTitleTemplate) {
  "use strict";

  var IssuePopoverView = Backbone.View.extend({
    className: 'commit-popover-body',
    render: function() {
      this.$el.html(commitPopoverTemplate(this.model.attributes));
      return this;
    }
  });

  var IssuePopoverTitleView = Backbone.View.extend({
    render: function() {
      this.$el.html(commitPopoverTitleTemplate(this.model.attributes));
      return this;
    }
  });

  function plaintextify($el) {
    $el.replaceWith($el.text());
  }

  function preparePopover($commit, url) {
    $.get(url, function(commit) {

      var commitModel = new Backbone.Model(commit);
      commitModel.set('date', moment(commit.author.date).format("LLL"));

      $commit.on('mouseover', function(e) {
        Popover.hoverTimeout(e, function() {
          var pop = new Popover({
            titleView: new IssuePopoverTitleView({model: commitModel}),
            view: new IssuePopoverView({model: commitModel}),
            targetElement: $commit[0],
            placement: 'horizontal'
          });
          pop.show();
        });
      });

    }).fail(function(error) {
      if(error.status === 404) {
        plaintextify($commit);
      }
    });
  }

  var decorator = {

    decorate: function(chatItemView) {
      chatItemView.$el.find('*[data-link-type="commit"]').each(function() {
        var $commit = $(this);

        var sha1 = this.dataset.commitSha1;
        var repo = this.dataset.commitRepo;

        if(!repo || !sha1) {
          // this aint no commit I ever saw
          plaintextify($commit);
        } else {
          this.target = "github";

          preparePopover($commit,'/api/private/gh/repos/'+repo+'/commits/'+sha1);
        }
      });

    }

  };

  return decorator;

});
