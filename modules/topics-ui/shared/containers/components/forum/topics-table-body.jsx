import React, { PropTypes } from 'react';
import TopicLink from '../links/topic-link.jsx';

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
    var {groupName} = this.props;
    //TODO add action to navigate
    const href = `/${groupName}/topics/topic/${topic.id}/${topic.slug}`
    return (
      <tr className="topics-table-body__row" key={`topics-table-row-${i}`}>
        <td className="topics-table-body__cell--first">
          <TopicLink groupName={groupName} topic={topic}>
            {topic.title}
          </TopicLink>
        </td>
        <td className="topics-table-body__cell">0</td>
        <td className="topics-table-body__cell">0</td>
        <td className="topics-table-body__cell--last">0</td>
      </tr>
    );
  }

});
