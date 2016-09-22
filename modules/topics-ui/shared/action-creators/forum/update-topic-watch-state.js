import { UPDATE_TOPIC_SUBSCRIPTION_STATE } from '../../constants/forum.js';

export default function updateTopicWatchState(forumId, topicId, state) {
  return {
    type: UPDATE_TOPIC_SUBSCRIPTION_STATE,
    forumId,
    topicId,
    state
  };
}
