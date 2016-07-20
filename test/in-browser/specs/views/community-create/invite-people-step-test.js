/*global describe:true, it:true, beforeEach:true */
'use strict';

var assert = require('assert');
var Backbone = require('backbone');
var context = require('utils/context');

var stepConstants = require('public/js/views/community-create/step-constants');
var CommunityCreateModel = require('public/js/views/community-create/community-create-model');
var CommunityCreateStepViewModel = require('public/js/views/community-create/community-create-step-view-model');
var InvitePeopleView = require('public/js/views/community-create/invite-step/community-creation-invite-people-view');


describe('community-creation-invite-people-view', function() {

  var communityCreateModel;
  var viewModel;
  var el;
  var view;

  var generateBeforeEachCb = function(newTroupeContext) {
    return function() {
      if(newTroupeContext) {
        context.testOnly.resetTroupeContext(newTroupeContext);
      }

      el = document.createElement('div');
      communityCreateModel = new CommunityCreateModel({
        active: true,
        stepState: stepConstants.INVITE
      });
      viewModel = new CommunityCreateStepViewModel({
        communityCreateModel: communityCreateModel,
        active: true
      });

      view = new InvitePeopleView({
        el: el,
        model: viewModel,
        communityCreateModel: communityCreateModel,
        orgCollection: new Backbone.Collection(),
        repoCollection: new Backbone.Collection()
      });
      view.render();
    }
  };

  beforeEach(generateBeforeEachCb());



  it('should add email to list after submitting', function() {
    view.ui.emailInput.val('foo@bar.com');
    view.ui.emailInput.trigger('input');
    view.ui.emailSubmit.trigger('click');
    assert.strictEqual(communityCreateModel.emailsToInvite.at(0).get('emailAddress'), 'foo@bar.com');
  });

  it('should not add email that is invalid after submitting', function() {
    assert.strictEqual(communityCreateModel.emailsToInvite.length, 0);
    view.ui.emailInput.val('foo');
    view.ui.emailInput.trigger('input');
    view.ui.emailSubmit.trigger('click');
    assert.strictEqual(communityCreateModel.emailsToInvite.length, 0);
  });



});
