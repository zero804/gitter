import React, { PropTypes } from 'react';
import classNames from 'classnames';

export default React.createClass({

  displayName: 'H1',
  propTypes: {
    className: PropTypes.string,
    children: PropTypes.node
  },

  render(){

    const { className } = this.props;
    const compiledClass = classNames('h1', className);

    return (<h1 className={compiledClass}>{this.props.children}</h1>);
  }

});
