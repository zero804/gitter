import { TOPIC_REPLIES_SORT_BY_LIKED } from '../../constants/topic.js';

export default function topicRepliesSortByLiked(topicId, slug) {
  return {
    type: TOPIC_REPLIES_SORT_BY_LIKED,
    topicId,
    slug
  };
}
