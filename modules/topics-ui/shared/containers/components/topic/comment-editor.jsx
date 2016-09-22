import React, { PropTypes } from 'react';
import Editor from '../forms/editor.jsx';

export default React.createClass({

  displayName: 'CommentEditor',
  propTypes: {
    onChange: PropTypes.func.isRequired,
    onEnter: PropTypes.func.isRequired,
  },

  render(){
    return (
      <Editor
        className="reply-comment-editor"
        onEnter={this.onEnter}
        onChange={this.onChange}/>
    );
  },

  onChange(val){
    this.props.onChange(val);
  },

  onEnter(){
    this.props.onEnter();
  }

});
