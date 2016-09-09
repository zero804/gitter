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
      avatarUrl: PropTypes.string.isRequired
    }).isRequired,
    onChange: PropTypes.func.isRequired,
    onEnter: PropTypes.func.isRequired,
  },

  render(){

    const {user, value} = this.props;

    return (
      <Container className="container--reply-editor">
        <Panel className="panel--reply-editor">
          <UserAvatar user={user} className="avatar--reply-editor" width={30} height={30}/>
          <Editor
            className="editor--reply"
            placeholder="Your reply here. Use Markdown, BBCode, or HTML to format. Drag or paste images ..."
            onChange={this.onChange}
            onEnter={this.onEnter}
            value={value}/>
          <button
            className="topic-reply-editor__submit"
            onClick={this.onSubmitClicked}>
            Reply
          </button>
        </Panel>
      </Container>
    );
  },

  onChange(val){
    this.props.onChange(val);
  },

  onEnter(){
    //this.props.onEnter();
  },

  onSubmitClicked(e){
    e.preventDefault();
    this.props.onEnter();
  }

});
