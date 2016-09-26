import { UPDATE_FORUM_SUBSCRIPTION_STATE } from '../../constants/forum.js';

export default function updateForumSubscriptionState(forumId, state) {
  return {
    type: UPDATE_FORUM_SUBSCRIPTION_STATE,
    forumId,
    state
  };
}
