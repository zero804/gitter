import { TOPIC_REPLIES_SORT_BY_RECENT } from '../../constants/topic.js';

export default function topicRepliesSortByRecent(topicId, slug) {
  return {
    type: TOPIC_REPLIES_SORT_BY_RECENT,
    topicId,
    slug
  };
}
