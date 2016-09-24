import React, { PropTypes } from 'react';
import Editor from '../forms/editor.jsx';
import UserAvatar from '../user/user-avatar.jsx';

export default React.createClass({

  displayName: 'CommentEditor',
  propTypes: {
    value: PropTypes.string,
    currentUser: PropTypes.object.isRequired,
    onChange: PropTypes.func.isRequired,
    onEnter: PropTypes.func.isRequired,
    autoFocus: PropTypes.bool,
  },

  render(){
    const {value, autoFocus, currentUser} = this.props;
    return (
      <div className="reply-comment-editor">
        <UserAvatar
          width={30}
          height={30}
          className="reply-comment-editor__avatar"
          user={currentUser} />
        <Editor
          autoFocus={autoFocus}
          className="reply-comment-editor__editor"
          value={value}
          onEnter={this.onEnter}
          onChange={this.onChange}/>
      </div>
    );
  },

  onChange(val){
    this.props.onChange(val);
  },

  onEnter(){
    this.props.onEnter();
  }

});
