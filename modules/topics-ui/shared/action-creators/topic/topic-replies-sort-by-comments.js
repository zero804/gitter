import { TOPIC_REPLIES_SORT_BY_COMMENTS } from '../../constants/topic.js';

export default function topicRepliesSortByComments(topicId, slug) {
  return {
    type: TOPIC_REPLIES_SORT_BY_COMMENTS,
    topicId,
    slug
  };
}
