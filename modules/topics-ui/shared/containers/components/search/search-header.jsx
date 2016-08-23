import React, { PropTypes } from 'react';
import Container from '../container.jsx';
import Panel from '../panel.jsx';

export default React.createClass({

  displayName: 'SearchHeader',
  propTypes: {},

  render(){
    return (
      <Container>
        <Panel>
          This is the news
        </Panel>
      </Container>
    );
  }

});
