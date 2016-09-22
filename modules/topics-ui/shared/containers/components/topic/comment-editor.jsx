import React, { PropTypes } from 'react';
import Editor from '../forms/editor.jsx';

export default React.createClass({

  displayName: 'CommentEditor',
  propTypes: {
    value: PropTypes.string,
    onChange: PropTypes.func.isRequired,
    onEnter: PropTypes.func.isRequired,
    autoFocus: PropTypes.bool,
  },

  render(){
    const {value, autoFocus} = this.props;
    return (
      <Editor
        autoFocus={autoFocus}
        className="reply-comment-editor"
        value={value}
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
