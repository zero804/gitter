import React, { PropTypes } from 'react';
import FeedItem from './feed-item.jsx';
import ReactionButton from '../forum/reaction-button.jsx';

export default React.createClass({

  displayName: 'CommentItem',
  propTypes: {
    comment: PropTypes.shape({
      id: PropTypes.string,
      body: PropTypes.shape({
        text: PropTypes.string.isRequired,
      })
    }),
    onReactionPick: PropTypes.func
  },

  render(){
    const {comment} = this.props;
    console.log('comment', comment);
    return (
      <FeedItem
        item={comment}
        footerChildren={this.getFeedItemFooterChildren()}/>
    );
  },

  getFeedItemFooterChildren(){
    return [
      <ReactionButton
        key="reactions"
        onReactionPick={this.onReactionPick}/>,
    ];
  },

  onReactionPick(reactionKey, isReacting) {
    const {comment, onReactionPick} = this.props;
    if(onReactionPick) {
      onReactionPick(comment.id, reactionKey, isReacting);
    }
  },

});
