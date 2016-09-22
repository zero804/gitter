import React, { PropTypes } from 'react';
import UserAvatar from '../user/user-avatar.jsx';
import CommentEditor from './comment-editor.jsx';

export default React.createClass({

  displayName: 'TopicReplyListItem',
  propTypes: {
    reply: PropTypes.shape({
      text: PropTypes.string,
      body: PropTypes.shape({
        html: PropTypes.string,
        text: PropTypes.string,
      }),
      formattedSentDate: PropTypes.string.isRequired,
      user: PropTypes.shape({
        avatarUrl: PropTypes.string.isRequired,
      }).isRequired

    }).isRequired,
    onCommentsClicked: PropTypes.func.isRequired,
    onNewCommentUpdate: PropTypes.func.isRequired,
    submitNewComment: PropTypes.func.isRequired,
  },

  render(){

    const {reply} = this.props;
    const {user} = reply;
    const avatarDims = 30;

    return (
      <article className="topic-reply-list-item">
        <div className="topic-reply-list-item__content">
          <div className="topic-reply-list-item__user-details">
            <UserAvatar
              className="topic-reply-list-item__avatar"
              user={user}
              width={avatarDims}
              height={avatarDims}/>
            <span className="topic-reply-list-item__sent">{reply.formattedSentDate}</span>
          </div>
          {this.getReplyContent(reply)}
        </div>
        <footer className="topic-reply-list-item__footer">
          <span className="topic-reply-list-item__likes">10 Likes</span>
          <button
            className="topic-reply-list-item__comments"
            onClick={this.onCommentsClicked}>
            2 Comments
          </button>
        </footer>
        {this.getComments()}
      </article>
    );
  },

  getReplyContent(){
    const {reply} = this.props;
    const body = (reply.body || {});
    if(body.html) {
      return (
        <div
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

  getComments(){
    const {reply} = this.props;
    if(!reply.isCommenting) { return; }
    return (
      <section className="reply-comment-list">
        <CommentEditor
          onEnter={this.submitNewComment}
          onChange={this.onNewCommentUpdate} />
      </section>
    );
  },

  onCommentsClicked(e){
    e.preventDefault();
    const {reply} = this.props;
    this.props.onCommentsClicked(reply.id);
  },

  onNewCommentUpdate(val){
    const {reply} = this.props;
    this.props.onNewCommentUpdate(reply.id, val);
  },

  submitNewComment(){
    this.props.submitNewComment();
  },

});
