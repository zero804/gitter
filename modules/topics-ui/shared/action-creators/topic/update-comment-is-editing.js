import { UPDATE_COMMENT_IS_EDITING } from '../../constants/topic.js';

export default function updateCommentIsEditing(commentId, isEditing) {
  return {
    type: UPDATE_COMMENT_IS_EDITING,
    commentId,
    isEditing
  };
}
