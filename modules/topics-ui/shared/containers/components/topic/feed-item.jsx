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
    onCancel: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
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
          {this.getPrimaryContent()}
          {this.getSecondaryContent()}
          {this.getEditControl()}
        </footer>
        {this.props.children}
      </article>
    );
  },

  getEditControl(){
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

  getPrimaryContent(){
    const {primaryLabel, primaryValue} = this.props;
    if(!primaryLabel){ return; }
    return (
      <span className="feed-item__likes">
        {primaryValue} {primaryLabel}
      </span>
    );
  },

  getSecondaryContent(){
    const {secondaryLabel, secondaryValue} = this.props;
    if(!secondaryLabel){ return; }

    return (
      <button
        className="feed-item__comments"
        onClick={this.props.onSecondaryClicked}>
        {secondaryValue} {secondaryLabel}
      </button>
    );
  },

  onEditClicked(e){
    e.preventDefault();
    this.setState({
      isEditing: true,
    });
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
