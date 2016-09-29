import _ from 'lodash';

const onReactionsUpdate = function({ entityId, replyId, commentId, reactionKey, isReacting }) {
  const id = entityId || replyId || commentId;
  const entity = this.collection.get(id);
  if(!entity) { return; }

  if(isReacting) {
    const reactionCounts = entity.get('reactionCounts') || {};
    const ownReactions = entity.get('ownReactions') || {};
    const existingCount = reactionCounts[reactionKey] || 0;

    let newCount = existingCount;
    if(isReacting === true && ownReactions[reactionKey] === false) {
      newCount += 1;
    }
    else if(isReacting === false && ownReactions[reactionKey] === true) {
      newCount -= 1;
    }

    entity.set({
      reactionCounts: _.extend({}, reactionCounts, {
        [reactionKey]: newCount
      }),
      ownReactions: _.extend({}, ownReactions, {
        [reactionKey]: isReacting
      })
    });
  }
}


export default function dipatchOnChangeMixin(Constructor, onReactionsUpdateCallbackName = 'onReactionsUpdate') {
  Constructor.prototype[onReactionsUpdateCallbackName] = onReactionsUpdate;

  return Constructor;

}
