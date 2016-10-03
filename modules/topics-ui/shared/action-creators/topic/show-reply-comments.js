import { SHOW_REPLY_COMMENTS } from '../../constants/topic';

export default function showReplyComments(replyId){
  return {
    replyId: replyId,
    type: SHOW_REPLY_COMMENTS
  };
}
