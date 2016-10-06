import { REQUEST_UPDATE_TOPIC_REACTIONS } from '../../constants/forum.js';

export default function requestUpdateTopicReactions(topicId, reactionKey, isReacting) {
  return {
    type: REQUEST_UPDATE_TOPIC_REACTIONS,
    topicId,
    reactionKey,
    isReacting
  };
}
