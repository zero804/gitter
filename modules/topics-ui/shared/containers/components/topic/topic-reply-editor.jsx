import React, { PropTypes } from 'react';
import classNames from 'classnames';

import Container from '../container.jsx';
import Panel from '../panel.jsx';
import Editor from '../forms/editor.jsx';
import UserAvatar from '../user/user-avatar.jsx';

import {AVATAR_SIZE_MEDIUM} from '../../../constants/avatar-sizes';

export default React.createClass({

  displayName: 'TopicReplyEditor',
  propTypes: {
    value: PropTypes.string,
    user: PropTypes.shape({
      avatarUrl: PropTypes.string
    }).isRequired,
    replyListEditorInFocus: PropTypes.bool,
    isSignedIn: PropTypes.bool,
    onChange: PropTypes.func.isRequired,
    onSubmit: PropTypes.func.isRequired,
    onFocus: PropTypes.func,
    onBlur: PropTypes.func,
    onEditorClick: PropTypes.func
  },

  getInitialState(){
    return { value: this.props.value }
  },

  render(){

    const {user, isSignedIn, value, replyListEditorInFocus} = this.props;
    const editorValue = (value || '');
    var submitText = 'Reply';
    if(!isSignedIn) {
      submitText = 'Sign in to reply';
    }

    const compiledClass = classNames({
      'panel--reply-editor--active': replyListEditorInFocus
    }, 'panel--reply-editor')

    return (
      <Container className="container--reply-editor">
        <Panel className={compiledClass}>
          <form
            className="reply-editor__form"
            onSubmit={this.onSubmit}
            action="#"
            method="post">
            <UserAvatar
              user={user}
              className="avatar--reply-editor"
              size={AVATAR_SIZE_MEDIUM} />
            <Editor
              value={editorValue}
              className="editor--reply"
              placeholder="Your reply here. Use Markdown, BBCode, or HTML to format."
              onChange={this.onChange}
              onClick={this.onEditorClick}
              onFocus={this.onEditorFocus}
              onBlur={this.onEditorBlur}/>
            <button
              className="topic-reply-editor__submit">
              {submitText}
            </button>
          </form>
        </Panel>
      </Container>
    );
  },

  onChange(val){
    this.props.onChange(val);
  },

  onSubmit(e){
    e.preventDefault();
    this.props.onSubmit();
  },

  onEditorClick() {
    const { onEditorClick } = this.props;
    if(onEditorClick) {
      onEditorClick(...arguments);
    }
  },

  onEditorFocus(){
    const {onFocus} = this.props;
    if(!onFocus) { return; }
    onFocus();
  },

  onEditorBlur(){
    const {onBlur} = this.props;
    if(!onBlur) { return; }
    onBlur();
  }

});
