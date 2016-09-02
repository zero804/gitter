import React, { PropTypes } from 'react';

export default React.createClass({

  displayName: 'TopicsTableHeader',
  propTypes: {},

  render(){
    return (
      <thead className="topics-table-header">
        <tr>
          <th className="topics-table-header__cell">Topic</th>
          <th className="topics-table-header__cell">Users</th>
          <th className="topics-table-header__cell">Replies</th>
          <th className="topics-table-header__cell">Likes</th>
        </tr>
      </thead>
    );
  }

});
