import React, { PropTypes } from 'react';
import FeedItem from './feed-item.jsx';

export default React.createClass({

  displayName: 'CommentItem',
  propTypes: {
    comment: PropTypes.shape({
      body: PropTypes.shape({
        text: PropTypes.string.isRequired,
      })
    })
  },

  render(){
    const {comment} = this.props;
    return (
      <FeedItem
        item={comment}
        footerChildren={this.getFeedItemFooterChildren()}/>
    );
  },

  getFeedItemFooterChildren(){
    return [
      <span
        key="likes"
        className="feed-item__likes">
        10 Likes
      </span>
    ];
  }

});
