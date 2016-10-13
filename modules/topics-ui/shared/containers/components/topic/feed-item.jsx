import React, { PropTypes } from 'react';
import UserAvatar from '../user/user-avatar.jsx';
import moment from 'moment';
import EditableContent from '../forms/editable-content.jsx';
import IconButton from '../buttons/icon-button.jsx';

import {AVATAR_SIZE_MEDIUM} from '../../../constants/avatar-sizes';
import {ICONS_EDIT} from '../../../constants/icons';

export default React.createClass({

  displayName: 'FeedItem',
  propTypes: {
    value: PropTypes.string,
    item: PropTypes.shape({
      sent: PropTypes.string.isRequired,
      canEdit: PropTypes.bool.isRequired,
      isEditing: PropTypes.bool.isRequired
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
    onDelete: PropTypes.func.isRequired,
    onEditClick: PropTypes.func
  },

  getDefaultProps(){
    return { value: '' }
  },

  render(){

    const {item, children, footerChildren} = this.props;
    const {user} = item;
    const formattedSentDate = item.sent && moment(item.sent).format('MMM Do');
    const formattedFullSentDate = item.sent && moment(item.sent).format('YYYY-MM-D, h:m A');

    /* The EditControl situation is BS. It needs to be fixed  */
    //TODO we need to make edit controls, reaction and follow buttons
    //smart components so they can dispatch events. This will prevent us
    //having to have these controls in scope to change state

    return (
      <article id={item.id} className="feed-item">

        {/* The aside here only displays the avatar pulled to the left hand side*/}
        <aside className="feed-item__aside">
          <UserAvatar
            user={user}
            size={AVATAR_SIZE_MEDIUM} />
        </aside>

        <section className="feed-item__content">

          {/* The header displays displayname | username  edit-button | sent date */}
          <header className="feed-item__content__header">

            {/* Edit controls are only shown for admins or owners */}
            {this.getEditControl()}

            {/* sent date displayed as -> MM dd */}
            <span className="feed-item__content__header__sent" title={formattedFullSentDate}>
              {formattedSentDate}
            </span>

          </header>

          {/* The actula user generated content */}
          <div className="feed-item__content__item">
            {this.getItemContent()}
          </div>

          {/* This will show like/comment/watch buttons */}
          <footer className="feed-item__content__footer">
            {footerChildren}
          </footer>
        </section>
      </article>
    );

  },

  getEditControl(){
    //Only show the edit button if we have
    //the correct permissions
    const { canEdit, isEditing} = this.props.item;
    if(!canEdit) { return; }

    if(isEditing) { return; }

    return (
      <IconButton
        className="feed-item__content__header__edit-button"
        type={ICONS_EDIT}
        onClick={this.onEditClicked} />
    );
  },

  getItemContent() {
    const { item } = this.props;
    const { isEditing } = item;
    return (
      <EditableContent
        content={item}
        onChange={this.onChange}
        onCancel={this.onCancelClicked}
        onSave={this.onSaveClicked}
        onDelete={this.onDelete}
        isEditing={isEditing} />
    );

  },

  onEditClicked(e){
    const { onEditClick } = this.props;
    e.preventDefault();
    if(onEditClick) {
      onEditClick();
    }
  },

  onChange(val){
    this.props.onChange(val);
  },

  onCancelClicked(){
    this.props.onCancel();
  },

  onSaveClicked(){
    this.props.onSave();
  },

  onDelete() {
    const { onDelete } = this.props;
    onDelete();
  }

});
