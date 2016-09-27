import { REQUEST_UPDATE_TOPIC_SUBSCRIPTION_STATE } from '../../constants/forum.js';

export default function requestUpdateTopicSubscriptionState(topicId, isSubscribed) {
  return {
    type: REQUEST_UPDATE_TOPIC_SUBSCRIPTION_STATE,
    topicId,
    isSubscribed: isSubscribed
  };
}
