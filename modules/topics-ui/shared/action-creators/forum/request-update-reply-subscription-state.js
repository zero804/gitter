import { REQUEST_UPDATE_REPLY_SUBSCRIPTION_STATE } from '../../constants/forum.js';

export default function requestUpdateTopicSubscriptionState(forumId, topicId, replyId, userId, isSubscribed) {
  return {
    type: REQUEST_UPDATE_REPLY_SUBSCRIPTION_STATE,
    forumId,
    topicId,
	replyId,
    userId,
    isSubscribed: isSubscribed
  };
}
