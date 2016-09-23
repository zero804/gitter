import React, { PropTypes } from 'react';
import Container from '../container.jsx';
import Panel from '../panel.jsx';
import Editor from '../forms/editor.jsx';
import UserAvatar from '../user/user-avatar.jsx';

export default React.createClass({

  displayName: 'TopicReplyEditor',
  propTypes: {
    value: PropTypes.string,
    user: PropTypes.shape({
      avatarUrl: PropTypes.string
    }).isRequired,
    onChange: PropTypes.func.isRequired,
    onSubmit: PropTypes.func.isRequired,
    onEditorClick: PropTypes.func
  },

  render(){

    const {user, value} = this.props;
    var isSignedIn = !!user.id;

    var submitText = 'Reply';
    if(!isSignedIn) {
      submitText = 'Sign in to reply';
    }

    return (
      <Container className="container--reply-editor">
        <Panel className="panel--reply-editor">
          <UserAvatar
            user={user}
            className="avatar--reply-editor"
            width={30}
            height={30}/>
          <Editor
            className="editor--reply"
            placeholder="Your reply here. Use Markdown, BBCode, or HTML to format. Drag or paste images ..."
            onChange={this.onChange}
            onClick={this.onEditorClick}
            value={value}/>
          <button
            className="topic-reply-editor__submit"
            onClick={this.onSubmitClicked}>
            {submitText}
          </button>
        </Panel>
      </Container>
    );
  },

  onChange(val){
    this.props.onChange(val);
  },

  onSubmitClicked(e){
    e.preventDefault();
    this.props.onSubmit();
  },

  onEditorClick() {
    const { onEditorClick } = this.props;
    if(onEditorClick) {
      onEditorClick(...arguments);
    }
  }

});
