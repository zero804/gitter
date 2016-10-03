import React, { PropTypes } from 'react';
import UserAvatar from '../user/user-avatar.jsx';
import moment from 'moment';
import EditableContent from '../forms/editable-content.jsx';

export default React.createClass({

  displayName: 'FeedItem',
  propTypes: {
    value: PropTypes.string,
    item: PropTypes.shape({
      sent: PropTypes.string.isRequired,
      canEdit: PropTypes.bool.isRequired,
    }).isRequired,
    children: React.PropTypes.oneOfType([
      React.PropTypes.arrayOf(React.PropTypes.node),
      React.PropTypes.node
    ]),
    footerChildren: React.PropTypes.oneOfType([
      React.PropTypes.arrayOf(React.PropTypes.node),
      React.PropTypes.node
    ]),
    onChange: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    onEditClick: PropTypes.func
  },

  getDefaultProps(){
    return { value: '' }
  },

  getInitialState(){
    return { isEditing: false }
  },

  render(){

    const {item, children, footerChildren} = this.props;
    const {user} = item;
    const avatarDims = 30;
    const formattedSentDate = item.sent && moment(item.sent).format('MMM Do');

    /* The EditControl situation is BS. It needs to be fixed  */
    //TODO we need to make edit controls, reaction and follow buttons
    //smart components so they can dispatch events. This will prevent us
    //having to have these controls in scope to change state
    return (
      <article className="feed-item">
        <div className="feed-item__content">
          <div className="feed-item__user-details">
            <UserAvatar
              className="feed-item__avatar"
              user={user}
              width={avatarDims}
              height={avatarDims}/>
            <span className="feed-item__sent">
              {formattedSentDate}
            </span>
          </div>
          {this.getItemContent()}
        </div>
        <footer className="feed-item__footer">
          {footerChildren}
          {this.getEditControl()}
        </footer>
        {children}
      </article>
    );
  },

  getEditControl(){

    //Only show the edit button if we have
    //the correct permissions
    const {canEdit} = this.props.item;
    if(!canEdit) { return; }

    return (
      <button
        className="feed-item__edit-control"
        onClick={this.onEditClicked}>
        Edit
      </button>
    );
  },

  getItemContent(){
    const {isEditing} = this.state;
    const {item} = this.props;
    return (
      <EditableContent
        className="feed-item__body"
        content={item}
        onChange={this.onChange}
        onCancel={this.onCancelClicked}
        onSave={this.onSaveClicked}
        isEditing={isEditing}/>
    );

  },


  onEditClicked(e){
    const { onEditClick } = this.props;
    e.preventDefault();
    this.setState({
      isEditing: true,
    });
    if(onEditClick) {
      onEditClick();
    }
  },

  onChange(val){
    this.props.onChange(val);
  },

  onCancelClicked(){
    this.props.onCancel();
    this.setState({ isEditing: false });
  },

  onSaveClicked(){
    this.props.onSave();
    this.setState({ isEditing: false });
  }

});
