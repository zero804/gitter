import { UPDATE_TOPIC_SUBSCRIPTION_STATE } from '../../constants/forum.js';

export default function updateTopicSubscriptionState(topicId, state) {
  return {
    type: UPDATE_TOPIC_SUBSCRIPTION_STATE,
    topicId,
    state
  };
}
