import React, { PropTypes } from 'react';

export default React.createClass({

  displayName: 'TopicsTableBody',
  propTypes: {
    topics: PropTypes.arrayOf(PropTypes.shape({
      title: PropTypes.shape({
        text: PropTypes.string
      })
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
    return (
      <tr className="topics-table-body__row" key={`topics-table-row-${i}`}>
        <td className="topics-table-body__cell--first">{topic.title.text}</td>
        <td className="topics-table-body__cell">0</td>
        <td className="topics-table-body__cell">0</td>
        <td className="topics-table-body__cell--last">0</td>
      </tr>
    );
  }

});
