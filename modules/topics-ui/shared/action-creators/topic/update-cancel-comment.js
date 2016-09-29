import { UPDATE_CANCEL_COMMENT } from '../../constants/topic.js';

export default function updateCancelComment(commentId){
  return {
    type: UPDATE_CANCEL_COMMENT,
    commentId
  };
}
