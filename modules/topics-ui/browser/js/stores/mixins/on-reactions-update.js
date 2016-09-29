import _ from 'lodash';

const onReactionsUpdate = function({ topicId, replyId, commentId, reactionKey, isReacting }) {
  const id = topicId || replyId || commentId;
  console.log('onReactionsUpdate', id, reactionKey, isReacting);
  const topic = this.collection.get(id);
  if(!topic) { return; }

  if(isReacting) {
    const reactionCounts = topic.get('reactionCounts') || {};
    const ownReactions = topic.get('ownReactions') || {};
    const existingCount = reactionCounts[reactionKey] || 0;

    let newCount = existingCount;
    if(isReacting === true && ownReactions[reactionKey] === false) {
    newCount += 1;
    }
    else if(isReacting === false && ownReactions[reactionKey] === true) {
    newCount -= 1;
    }

    topic.set({
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
