import { UPDATE_COMMENT } from '../../constants/topic.js';

export default function updateComment(commentId, text){
  return {
    type: UPDATE_COMMENT,
    commentId,
    text
  };
}
