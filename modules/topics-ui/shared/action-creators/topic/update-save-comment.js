import { UPDATE_SAVE_COMMENT } from '../../constants/topic.js';

export default function updateSaveComment(commentId, replyId){
  return {
    type: UPDATE_SAVE_COMMENT,
    commentId,
    replyId
  };
}
