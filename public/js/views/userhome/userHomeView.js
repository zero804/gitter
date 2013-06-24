/*jshint unused:true, browser:true */
define([
  'views/base',
  'hbs!./tmpl/userHomeTemplate',
  'log!user-home-view'
], function(TroupeViews, userHomeTemplate, log) {
  "use strict";

  var View = TroupeViews.Base.extend({

  });

  return TroupeViews.Base.extend({
      initialize: function(options) {
        options.template = userHomeTemplate;
        TroupeViews.Base.prototype.initialize.apply(this, arguments);
        this.view = new View({ });
      },
      getRenderData: function() {
        var c = window.troupeContext;
        return {
          username: c.user.username,
          basePath: c.basePath,
          baseServer: c.baseServer
        };
      }
    });
  });
