import React, { PropTypes } from 'react';
import FeedItem from './feed-item.jsx';

export default React.createClass({

  displayName: 'CommentItem',
  propTypes: {
    comment: PropTypes.shape({
      body: PropTypes.shape({
        text: PropTypes.string.isRequired,
      })
    }),
    onChange: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
  },

  render(){
    const {comment} = this.props;
    return (
      <FeedItem
        onChange={this.onChange}
        onCancel={this.onCancel}
        onSave={this.onSave}
        item={comment}/>
    );
  },

  onChange(val){
    this.props.onChange(val);
  },

  onCancel(val){
    this.props.onCancel(val);
  },

  onSave(val){
    this.props.onSave(val);
  },

});
