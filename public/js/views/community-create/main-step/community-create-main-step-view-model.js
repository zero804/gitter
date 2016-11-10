/* eslint complexity: ["error", 15] */
'use strict';

var CommunityCreateStepViewModel = require('../community-create-step-view-model');
var slugAvailabilityStatusConstants = require('../slug-availability-status-constants');
var slugger = require('../../../utils/slugger');

var CommunityCreateMainStepViewModel = CommunityCreateStepViewModel.extend({
  validate: function() {
    var errors = {};

    var communityName = this.communityCreateModel.get('communityName') || '';

    var hasCommunityName = communityName.length > 0;
    if(!hasCommunityName) {
      errors.communityName = 'Please fill in the community name';
    } else if (!/^[^\<\>]{1,80}$/.test(communityName)) {
      errors.communityName = 'Invalid community name';
    }

    var communitySlug = this.communityCreateModel.get('communitySlug') || '';
    var hasCommunitySlug = communitySlug.length > 0;
    var slugValid = slugger.isValid(communitySlug);
    var slugAvailabilityStatus = this.communityCreateModel.get('communitySlugAvailabilityStatus');
    if(!hasCommunitySlug) {
      errors.communitySlug = 'Please fill in the community slug';
    } else if(communitySlug.length < 2 || communitySlug.length > 80) {
      errors.communitySlug = 'Slug length must be 2 to 80 characters';
    } else if(!slugValid || slugAvailabilityStatus === slugAvailabilityStatusConstants.INVALID) {
      errors.communitySlug = 'Slug contains invalid characters';
    } else if(slugAvailabilityStatus === slugAvailabilityStatusConstants.AUTHENTICATION_FAILED) {
      errors.communitySlug = 'Authentication Failed. It is probably a GitHub app scope mismatch between public/private on your own user and the org';
    } else if(slugAvailabilityStatus === slugAvailabilityStatusConstants.NEEDS_MORE_PERMISSIONS) {
      errors.communitySlug = 'Allow private repo access on the GitHub org or make your org membership public. We are forbidden from seeing what is going on';
    } else if(slugAvailabilityStatus === slugAvailabilityStatusConstants.UNAVAILABLE) {
      errors.communitySlug = 'This address is not available';
    } else if(slugAvailabilityStatus === slugAvailabilityStatusConstants.PENDING) {
      errors.communitySlug = 'Checking availability';
    }

    return Object.keys(errors).length > 0 ? errors : undefined;
  }
});

module.exports = CommunityCreateMainStepViewModel;
