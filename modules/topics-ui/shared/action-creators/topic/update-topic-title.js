import { UPDATE_TOPIC_TITLE } from '../../constants/topic.js';

export default function updateTopicTitle(title) {
  return {
    type: UPDATE_TOPIC_TITLE,
    title
  };
}
