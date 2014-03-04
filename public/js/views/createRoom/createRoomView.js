/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */

define([
  'jquery',
  'marionette',
  'collections/instances/troupes',
  'views/base',
  './parentSelectView',
  'hbs!./tmpl/createRoom'
], function($, Marionette, troupeCollections, TroupeViews, ParentSelectView, template) {
  "use strict";

  var View = Marionette.Layout.extend({
    template: template,

    ui: {
      autoJoin: "#auto-join",
      permPublic: "#perm-select-public",
      permPrivate: "#perm-select-private",
      permInherited: "#perm-select-inherited",
      selectParentRequired: "#perm-select-required",
      parentNameLabel: "#parent-name",
      permInheritedLabel: '#perm-inherited-label',
      roomNameInput: '#room-name'
    },

    regions: {
      ownerSelect: '#owner-region',
    },

    parentSelected: function(model, animated) {
      var hide = [this.ui.autoJoin, this.ui.permPublic, this.ui.permPrivate, this.ui.permInherited];
      var show = [this.ui.selectParentRequired];
      var placeholder = "";

      if(model) {
        this.ui.parentNameLabel.text(model.get('name'));
        switch(model.get('type')) {
          case 'org':
          case 'repo':
            this.ui.permInheritedLabel.text(model.get('type') === 'repo' ? 'Repository' : 'Organisation');
            show = [this.ui.autoJoin, this.ui.permPublic, this.ui.permPrivate, this.ui.permInherited];
            hide = [this.ui.selectParentRequired];
            placeholder = "Required";
            break;
          case 'user':
            show = [this.ui.permPublic, this.ui.permPrivate];
            hide = [this.ui.selectParentRequired, this.ui.permInherited, this.ui.autoJoin];
            placeholder = "Optional";
            break;
        }
      }

      function arrayToJq(array) {
        var elements = [];
        array.forEach(function(a) {
          elements = elements.concat(a.get());
        });
        return $(elements);
      }

      this.ui.roomNameInput.attr('placeholder', placeholder);
      if(animated === false) {
        arrayToJq(show).show();
        arrayToJq(hide).hide();
      } else {
        arrayToJq(show).filter(':hidden').slideDown("fast");
        arrayToJq(hide).filter(':visible').slideUp("fast");
      }
    },

    onRender: function() {
      var parentSelect = new ParentSelectView({
        orgsCollection: troupeCollections.orgs,
        troupesCollection: troupeCollections.troupes
      });
      this.parentSelect = parentSelect;
      this.ownerSelect.show(parentSelect);


      this.listenTo(parentSelect, 'selected', this.parentSelected);

      if(this.options.initialParent) {
        var model = this.parentSelect.selectUri(this.options.initialParent);
        this.parentSelected(model, false);
      } else {
        this.parentSelected(null, false);
      }
    },


  });

  var Modal = TroupeViews.Modal.extend({
    disableAutoFocus: true,
    initialize: function(options) {
      options = options || {};
      options.title = options.title || "Create a chat room";

      TroupeViews.Modal.prototype.initialize.call(this, options);
      this.view = new View(options);
    }
  });

  return {
    View: View,
    Modal: Modal
  };

});
