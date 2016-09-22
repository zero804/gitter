import { REQUEST_UPDATE_TOPIC_SUBSCRIPTION_STATE } from '../../constants/forum.js';

export default function requestUpdateTopicSubscriptionState(forumId, topicId, userId, isSubscribed) {
  return {
    type: REQUEST_UPDATE_TOPIC_SUBSCRIPTION_STATE,
    forumId,
    topicId,
    userId,
    isSubscribed: isSubscribed
  };
}
