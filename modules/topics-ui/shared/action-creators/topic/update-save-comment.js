import { UPDATE_SAVE_COMMENT } from '../../constants/topic.js';

export default function updateSaveComment(commentId){
  return {
    type: UPDATE_SAVE_COMMENT,
    commentId
  };
}
