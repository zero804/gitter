"use strict";

import React, { PropTypes } from 'react';
import Container from '../container.jsx';
import Panel from '../panel.jsx';
import TopicTableButton from './table-control-button.jsx';

module.exports = React.createClass({

  displayName: 'ForumTableControl',
  propTypes: {
    groupName: PropTypes.string.isRequired,
    category: PropTypes.string.isRequired,
  },

  render(){

    const { groupName, category } = this.props;

    return (
      <Container className="container--table-control">
        <Panel className="panel--table-control">
          <nav>
            <ul className="table-control">
              <li>
                <TopicTableButton
                  title="Activity"
                  value="activity"
                  groupName={groupName}
                  category={category}
                  active={false}
                  onClick={this.onFilterUpdate}/>
              </li>
              <li>
                <TopicTableButton
                  title="My Topics"
                  value="my-topics"
                  groupName={groupName}
                  category={category}
                  active={false}
                  onClick={this.onFilterUpdate}/>
              </li>
              <li>
                <TopicTableButton
                  title="Watched"
                  value="watched"
                  groupName={groupName}
                  category={category}
                  active={false}
                  onClick={this.onFilterUpdate}/>
              </li>
            </ul>
          </nav>
        </Panel>
      </Container>
    );
  },

  onFilterUpdate(){
    console.log('Filter Update');
  }

});
