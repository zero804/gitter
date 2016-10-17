import React, { PropTypes } from 'react';

export default React.createClass({

  displayName: 'H1',
  propTypes: {
    className: PropTypes.string,
    children: PropTypes.node
  },

  render(){

    const { className } = this.props;
    const compiledClass = className || 'h1';

    return (<h1 className={compiledClass}>{this.props.children}</h1>);
  }

});
