import React, { PropTypes } from 'react';
import Container from '../container.jsx';
import Panel from '../panel.jsx';
import Editor from '../forms/editor.jsx';

export default React.createClass({

  displayName: 'TopicReplyEditor',
  propTypes: {

  },

  render(){
    return (
      <Container>
        <Panel>

          <Editor />
        </Panel>
      </Container>
    );
  }

});
