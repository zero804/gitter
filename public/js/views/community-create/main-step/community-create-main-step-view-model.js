/* eslint complexity: ["error", 15] */
'use strict';

const context = require('gitter-web-client-context');
var CommunityCreateStepViewModel = require('../community-create-step-view-model');
var slugAvailabilityStatusConstants = require('../slug-availability-status-constants');
var slugger = require('../../../utils/slugger');

var CommunityCreateMainStepViewModel = CommunityCreateStepViewModel.extend({
  // eslint-disable-next-line complexity
  validate: function() {
    var errors = {};

    var communityName = this.communityCreateModel.get('communityName') || '';

    var hasCommunityName = communityName.length > 0;
    if (!hasCommunityName) {
      errors.communityName = 'Please fill in the community name';
    } else if (!/^[^\<\>]{1,80}$/.test(communityName)) {
      errors.communityName = 'Invalid community name';
    }

    var communitySlug = this.communityCreateModel.get('communitySlug') || '';
    var hasCommunitySlug = communitySlug.length > 0;
    var slugValid = slugger.isValid(communitySlug);
    var slugAvailabilityStatus = this.communityCreateModel.get('communitySlugAvailabilityStatus');
    if (!hasCommunitySlug) {
      errors.communitySlug = 'Please fill in the community slug';
    } else if (communitySlug.length < 2 || communitySlug.length > 80) {
      errors.communitySlug = 'Slug length must be 2 to 80 characters';
    } else if (!slugValid || slugAvailabilityStatus === slugAvailabilityStatusConstants.INVALID) {
      errors.communitySlug = 'Slug contains invalid characters';
    } else if (slugAvailabilityStatus === slugAvailabilityStatusConstants.AUTHENTICATION_FAILED) {
      errors.communitySlug =
        'Authentication Failed. It is probably a GitHub app scope mismatch between public/private on your own user and the org';
    } else if (slugAvailabilityStatus === slugAvailabilityStatusConstants.GITHUB_CLASH) {
      const githubInfo = this.communityCreateModel.getGithubProjectInfo();

      // If you select the `foo/bar` repo, it fills in the community URI as `bar` and then tells you don't have proper permissions for `bar` because the `bar` org already exists on GitHub.
      if (githubInfo.type === 'GH_REPO') {
        const repoName = githubInfo.linkPath.split('/').pop();
        errors.communitySlug = `The name of the GitHub repo you selected conflicts with the name of a GitHub org/user. When you select the a repo "${githubInfo.linkPath}", it fills out the community URI as "${repoName}" which clashes another GitHub org/user. Change your community URI to proceed.`;
      }
      // If they are a GitHub user, they just need more permissions to resolve the clash (#github-uri-split)
      else if (context.hasProvider('github')) {
        errors.communitySlug = `There is a URI clash with an org/repo/user on GitHub. Change your community URI to proceed or if you in control of this org/repo, allow private repo access on the GitHub org or make your org membership public. We are currently not allowed to see that you control the GitHub org/repo`;
      } else {
        // If they aren't a GitHub user, there is no way they can create something with the same GitHub URI
        errors.communitySlug =
          'There is a URI clash with an org/repo/user on GitHub. Change your community URI to proceed.';
      }
    } else if (slugAvailabilityStatus === slugAvailabilityStatusConstants.UNAVAILABLE) {
      errors.communitySlug = 'This address is not available';
    } else if (slugAvailabilityStatus === slugAvailabilityStatusConstants.PENDING) {
      errors.communitySlug = 'Checking availability';
    }

    return Object.keys(errors).length > 0 ? errors : undefined;
  }
});

module.exports = CommunityCreateMainStepViewModel;
