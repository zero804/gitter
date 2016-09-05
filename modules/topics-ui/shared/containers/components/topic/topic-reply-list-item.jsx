import React, { PropTypes } from 'react';
import UserAvatar from '../user/user-avatar.jsx';

export default React.createClass({

  displayName: 'TopicReplyListItem',
  propTypes: {
    reply: PropTypes.shape({

      formattedSentDate: PropTypes.string.isRequired,
      displayText: PropTypes.string.isRequired,

      user: PropTypes.shape({
        avatarUrl: PropTypes.string.isRequired,
      }).isRequired

    }).isRequired,
  },

  render(){

    const {reply} = this.props;
    const {user} = reply;
    const avatarDims = 15;

    return (
      <article className="topic-reply-list-item">
        <header className="topic-reply-list-item__header">
          <UserAvatar user={user} width={avatarDims} height={avatarDims}/>
          <span className="topic-reply-list-item__sent">{reply.formattedSentDate}</span>
        </header>
        {this.getReplyContent(reply)}
        <footer></footer>
      </article>
    );
  },

  getReplyContent(){
    const {reply} = this.props;
    const body = (reply.body || {});
    if(body.html) {
      return (
        <section
          className="topic-reply-list-item__body"
          dangerouslySetInnerHTML={{ __html: body.html }} />
      );
    }
    return (
      <section className="topic-reply-list-item__body">
        {reply.text}
      </section>
    );
  },

});
