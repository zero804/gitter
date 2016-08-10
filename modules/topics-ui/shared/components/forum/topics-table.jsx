"use strict";

import React, { PropTypes } from 'react';
import Container from '../container.jsx';
import TopicsTableHeader from './topics-table-header.jsx';
import TopicsTableBody from './topics-table-body.jsx';

export default React.createClass({

  displayName: 'TopicsTable',
  propTypes: {
    topics: PropTypes.array.isRequired
  },

  render(){
    const { topics } = this.props;
    return (
      <Container>
        <table className="topics-table">
          <TopicsTableHeader />
          <TopicsTableBody topics={topics} />
        </table>
      </Container>
    );
  }

});
