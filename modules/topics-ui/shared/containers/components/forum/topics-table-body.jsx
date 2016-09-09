import React, { PropTypes } from 'react';
import TopicLink from '../links/topic-link.jsx';
import UserAvatar from '../user/user-avatar.jsx';

export default React.createClass({

  displayName: 'TopicsTableBody',
  propTypes: {
    groupName: PropTypes.string.isRequired,
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
    const {groupName} = this.props;
    const {user, replyingUsers} = topic;
    return (
      <tr className="topics-table-body__row" key={`topics-table-row-${i}`}>
        <td className="topics-table-body__cell--details">
          <UserAvatar
            className="topics-table-body__cell__avatar"
            user={user}
            width={28}
            height={28}/>
          <TopicLink
            className="topics-table-body__cell__link"
            groupName={groupName}
            topic={topic}>
            {topic.title}
          </TopicLink>
        </td>
        <td className="topics-table-body__cell">
          {this.getUserList(replyingUsers)}
        </td>
        <td className="topics-table-body__cell">0</td>
        <td className="topics-table-body__cell">0</td>
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
        width={10}
        height={10}
        user={user}
        className="topics-table-body__user-list__item"
        key={`user-list-item${i}`} />
    );
  }

});
