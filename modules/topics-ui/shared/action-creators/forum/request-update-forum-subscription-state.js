import { REQUEST_UPDATE_FORUM_SUBSCRIPTION_STATE } from '../../constants/forum.js';

export default function requestUpdateForumSubscriptionState(forumId, userId, isSubscribed) {
  return {
    type: REQUEST_UPDATE_FORUM_SUBSCRIPTION_STATE,
    forumId,
    userId,
    isSubscribed: isSubscribed
  };
}
