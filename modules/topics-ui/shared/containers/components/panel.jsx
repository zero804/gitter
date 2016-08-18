import React from 'react';
import classNames from 'classnames';

export default React.createClass({

  displayName: 'Panel',

  propTypes: {
    className: React.PropTypes.string,
    children: React.PropTypes.node
  },

  render(){

    const { className } = this.props;
    const compiledClass = classNames('panel', className);

    return (
      <div className={compiledClass}>{ this.props.children }</div>
    );
  }
});
