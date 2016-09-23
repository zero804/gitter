import React, { PropTypes } from 'react';
import UserAvatar from '../user/user-avatar.jsx';
import moment from 'moment';
import EditableContent from '../forms/editable-content.jsx';

export default React.createClass({

  displayName: 'FeedItem',
  propTypes: {
    value: PropTypes.string,
    children: PropTypes.node,
    item: PropTypes.shape({
      sent: PropTypes.string.isRequired,
    }),
    canEdit: PropTypes.bool,
    isEditing: PropTypes.bool,
    primaryLabel: PropTypes.string,
    secondaryLabel: PropTypes.string,
    primaryValue: PropTypes.number,
    secondaryValue: PropTypes.number,
    onSecondaryClicked: PropTypes.func,
    onChange: PropTypes.func.isRequired,
  },

  getDefaultProps(){
    //TODO Change to false
    return { canEdit: true, value: '' }
  },

  getInitialState(){
    return { isEditing: false }
  },

  render(){

    const {item} = this.props;
    const {user} = item;
    const avatarDims = 30;
    const formattedSentDate = moment(item.sent).format('MMM Do')

    return (
      <article className="topic-reply-list-item">
        <div className="topic-reply-list-item__content">
          <div className="topic-reply-list-item__user-details">
            <UserAvatar
              className="topic-reply-list-item__avatar"
              user={user}
              width={avatarDims}
              height={avatarDims}/>
            <span className="topic-reply-list-item__sent">
              {formattedSentDate}
            </span>
          </div>
          {this.getItemContent()}
        </div>
        <footer className="topic-reply-list-item__footer">
          {this.getPrimaryContent()}
          {this.getSecondaryContent()}
          {this.getEditControl()}
        </footer>
        {this.props.children}
      </article>
    );
  },

  getEditControl(){
    const {canEdit} = this.props;
    if(!canEdit){ return; }
    return (
      <button onClick={this.onEditClicked}>Edit</button>
    );
  },

  getItemContent(){
    const {isEditing} = this.state;
    const {item} = this.props;
    const {text, body} = item;
    const {html} = body;
    const markdownContent = body.text;

    if(isEditing) {
      return <EditableContent
        className="topic-reply-list-item__body"
        onChange={this.onChange}
        markdownContent={markdownContent}
        isEditing={true}/>
    }

    if(item.text) {
      return <EditableContent
        className="topic-reply-list-item__body"
        onChange={this.onChange}
        textContent={text}
        isEditing={false}/>
    }

    if(item.body.text) {
      return <EditableContent
        className="topic-reply-list-item__body"
        onChange={this.onChange}
        htmlContent={html}
        isEditing={false}/>
    }

  },

  getPrimaryContent(){
    const {primaryLabel, primaryValue} = this.props;
    if(!primaryLabel){ return; }
    return (
      <span className="topic-reply-list-item__likes">
        {primaryValue} {primaryLabel}
      </span>
    );
  },

  getSecondaryContent(){
    const {secondaryLabel, secondaryValue} = this.props;
    if(!secondaryLabel){ return; }

    return (
      <button
        className="topic-reply-list-item__comments"
        onClick={this.props.onSecondaryClicked}>
        {secondaryValue} {secondaryLabel}
      </button>
    );
  },

  onEditClicked(e){
    e.preventDefault();
    this.setState({
      isEditing: true,
    })
  },

  onChange(val){
    this.props.onChange(val);
  }

});
