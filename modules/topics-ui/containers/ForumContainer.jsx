'use strict';

var React = require('react');
var Container = require('../shared/components/container.jsx');
var Panel = require('../shared/components/panel.jsx');

module.exports = React.createClass({

  displayName: 'ForumContainer',

  propTypes: {
    categoryStore: React.PropTypes.shape({
      models: React.PropTypes.array.isRequired,
      getCategories: React.PropTypes.func.isRequired
    })
  },

  render() {
    const categories = this.props.categoryStore.getCategories();
    return (
      //Search header ...
      <Container>
        <Panel>
          { categories.map((cat, i) => <span key={i}>{cat}</span>) }
        </Panel>
      </Container>
    );
  }
});
