import React from 'react';
import classNames from 'classnames';

export default React.createClass({

  displayName: 'Container',
  propTypes: {
    className: React.PropTypes.string,
    children: React.PropTypes.node
  },

  render(){

    const { className } = this.props;
    const compiledClass = classNames('container', className);

    return (
      <section className={compiledClass} >{this.props.children}</section>
    );
  }
})
