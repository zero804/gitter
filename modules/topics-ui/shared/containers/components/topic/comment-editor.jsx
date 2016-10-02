import React, { PropTypes } from 'react';
import Editor from '../forms/editor.jsx';
import UserAvatar from '../user/user-avatar.jsx';
//import moment from 'moment';
import {AVATAR_SIZE_MEDIUM} from '../../../constants/avatar-sizes';

export default React.createClass({

  displayName: 'CommentEditor',
  propTypes: {
    value: PropTypes.string,
    user: PropTypes.object.isRequired,
    onChange: PropTypes.func.isRequired,
    onEnter: PropTypes.func.isRequired,
    autoFocus: PropTypes.bool,
  },

  /*
  * Have removed this for now as the dates have been removed
  * from the under-avatar positions in the feed-items
    <span
      className="reply-comment-editor__sent">
      {formattedSentDate}
    </span>
  */

  render(){
    const {value, autoFocus, user} = this.props;
    //const formattedSentDate = moment().format('MMM Do');
    return (
      <section className="reply-comment-editor">
        <aside className="reply-comment-editor__details">
          <UserAvatar
            size={AVATAR_SIZE_MEDIUM}
            className="reply-comment-editor__avatar"
            user={user} />
        </aside>
        <Editor
          autoFocus={autoFocus}
          placeholder="Your reply here. Use Markdown, BBCode, or HTML to format. Drag or paste images ..."
          className="reply-comment-editor__editor"
          value={value}
          onEnter={this.onEnter}
          onChange={this.onChange}/>
      </section>
    );
  },

  onChange(val){
    this.props.onChange(val);
  },

  onEnter(){
    this.props.onEnter();
  }

});
