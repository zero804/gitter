import React, { PropTypes } from 'react';
import Container from '../container.jsx';
import Panel from '../panel.jsx';
import Editor from '../forms/editor.jsx';
import UserAvatar from '../user/user-avatar.jsx';

export default React.createClass({

  displayName: 'TopicReplyEditor',
  propTypes: {
    user: PropTypes.shape({
      avatarUrl: PropTypes.string.isRequired
    }).isRequired,
    onChange: PropTypes.func.isRequired,
  },

  render(){

    const {user} = this.props;

    return (
      <Container className="container--reply-editor">
        <Panel className="panel--reply-editor">
          <UserAvatar user={user} className="avatar--reply-editor" width={30} height={30}/>
          <Editor className="editor--reply" onChange={this.onChange}/>
        </Panel>
      </Container>
    );
  },

  onChange(val){
    this.props.onChange(val);
  }

});
