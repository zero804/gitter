import React, { PropTypes } from 'react';
import TopicLink from '../links/topic-link.jsx';
import UserAvatar from '../user/user-avatar.jsx';
import {AVATAR_SIZE_SMALL, AVATAR_SIZE_MEDIUM} from '../../../constants/avatar-sizes';

export default React.createClass({

  displayName: 'TopicsTableBody',
  propTypes: {
    groupUri: PropTypes.string.isRequired,
    topics: PropTypes.arrayOf(PropTypes.shape({
      title: PropTypes.string.isRequired
    }))
  },

  render(){
    const { topics } = this.props;
    return (
      <tbody className="topics-table-body">
      {topics.map((topic, i) => this.renderChildRow(topic, i))}
      </tbody>
    );
  },

  renderChildRow(topic, i) {
    const {groupUri} = this.props;
    const {user, replyingUsers} = topic;

    return (
      <tr
        key={`topics-table-row-${i}`}
        id={topic.id}
        className="topics-table-body__row">
        <td className="topics-table-body__cell--details">
          <UserAvatar
            className="topics-table-body__cell__avatar"
            user={user}
            size={AVATAR_SIZE_MEDIUM} />
          <TopicLink
            className="topics-table-body__cell__link"
            groupUri={groupUri}
            topic={topic}>
            {topic.title}
          </TopicLink>
        </td>
        <td className="topics-table-body__cell">
          {this.getUserList(replyingUsers)}
        </td>
        <td className="topics-table-body__cell">
          {topic.repliesTotal}
        </td>
        <td className="topics-table-body__cell">
          {topic.reactions.like || 0}
        </td>
      </tr>
    );
  },

  getUserList(users){
    return (
      <ul className="topics-table-body__user-list">
        {users.map(this.getUserListAvatar)}
      </ul>
    );
  },

  getUserListAvatar(user, i){
    return (
      <UserAvatar
        size={AVATAR_SIZE_SMALL}
        user={user}
        className="topics-table-body__user-list__item"
        key={`user-list-item${i}`} />
    );
  }

});
