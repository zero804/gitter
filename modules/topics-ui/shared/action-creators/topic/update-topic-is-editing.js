import { UPDATE_TOPIC_IS_EDITING } from '../../constants/topic.js';

export default function updateTopicIsEditing(isEditing) {
  return {
    type: UPDATE_TOPIC_IS_EDITING,
    isEditing
  };
}
