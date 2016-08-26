import React, { PropTypes } from 'react';
import UserAvatar from '../user/user-avatar.jsx';

export default React.createClass({

  displayName: 'TopicReplyListItem',
  propTypes: {
    reply: PropTypes.shape({

      formattedSentDate: PropTypes.string.isRequired,
      body: PropTypes.shape({
        html: PropTypes.string.isRequired
      }).isRequired,

      user: PropTypes.shape({
        avatarUrl: PropTypes.string.isRequired,
      }).isRequired

    }).isRequired,
  },

  render(){

    const {reply} = this.props;
    const {user} = reply;
    const avatarDims = 15;
    console.log(reply);

    return (
      <article className="topic-reply-list-item">
        <header className="topic-reply-list-item__header">
          <UserAvatar user={user} width={avatarDims} height={avatarDims}/>
          <span className="topic-reply-list-item__sent">{reply.formattedSentDate}</span>
        </header>
        <section
          className="topic-reply-list-item__body"
          dangerouslySetInnerHTML={{ __html: reply.body.html}}>
        </section>
        <footer></footer>
      </article>
    );
  }

});
