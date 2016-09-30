import { UPDATE_TOPIC_REACTIONS } from '../../constants/forum.js';

export default function updateTopicReactions(topicId, reactionKey, isReacting) {
  return {
    type: UPDATE_TOPIC_REACTIONS,
    topicId,
    reactionKey,
    isReacting
  };
}
