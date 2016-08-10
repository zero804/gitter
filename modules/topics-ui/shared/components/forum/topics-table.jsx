"use strict";

import React, { PropTypes } from 'react';
import Container from '../container.jsx';
import TopicsTableHeader from './topics-table-header.jsx';

export default React.createClass({

  displayName: 'TopicsTable',
  propTypes: {
    topics: PropTypes.array.isRequired
  },

  render(){
    return (
      <Container>
        <table className="topics-table">
          <TopicsTableHeader />
        </table>
      </Container>
    );
  }

});
