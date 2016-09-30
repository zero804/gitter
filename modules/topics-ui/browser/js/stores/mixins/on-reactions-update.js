import _ from 'lodash';

const onReactionsUpdate = function({ topicId, replyId, commentId, reactionKey, isReacting }) {
  const id = topicId || replyId || commentId;
  const entity = this.get(id);
  if(!entity) { return; }

  const ownReactions = entity.get('ownReactions') || {};

  entity.set({
    // `reactions` is handled in the live-collection
    ownReactions: _.extend({}, ownReactions, {
      [reactionKey]: isReacting
    })
  });
}


export default function dipatchOnChangeMixin(Constructor, onReactionsUpdateCallbackName = 'onReactionsUpdate') {
  Constructor.prototype[onReactionsUpdateCallbackName] = onReactionsUpdate;

  return Constructor;

}
