import { UPDATE_REPLY_IS_EDITING } from '../../constants/topic.js';

export default function updateReplyIsEditing(replyId, isEditing) {
  return {
    type: UPDATE_REPLY_IS_EDITING,
    replyId,
    isEditing
  };
}
