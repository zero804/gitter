import React, { PropTypes } from 'react';
import fuzzysearch from 'fuzzysearch';
import _ from 'lodash';

import Input from './input.jsx';
import {ESC_KEY, TAB_KEY, UP_KEY, DOWN_KEY} from '../../../../shared/constants/keys';

const arrayBoundWrap = function(index, length) {
  return ((index % length) + length) % length;
};

export default React.createClass({

  displayName: 'TextTypeAhead',
  propTypes: {
    name: PropTypes.string.isRequired,
    completions: PropTypes.arrayOf(PropTypes.string).isRequired,
    onSubmit: PropTypes.func.isRequired,
    value: PropTypes.string,
    placeholder: PropTypes.string,
  },

  getInitialState(){
    return {
      value: this.props.value,
      completions: this.props.completions.map((c) => ({
        value: c,
        active: false
      })),
    };
  },

  render(){
    const {name} = this.props;
    return (
      <div className="type-ahead-wrapper" onKeyDown={this.onKeyDown}>
        <Input name={name} onChange={this.onInputChange}/>
        {this.getCompletions()}
      </div>
    );
  },

  getCompletions(){
    const {value} = this.state;
    if(!value || !value.length) { return; }

    const { completions } = this.state;
    const matchingCompletions = completions.filter((c) => fuzzysearch(value, c.value));
    if(!matchingCompletions.length) { return; }

    return (
      <ul className="type-ahead">
        {matchingCompletions.map(function(completion, i){
          const className = completion.active ? 'type-ahead__child--active' : 'type-ahead__child'
          return (
            <li
              key={`type-ahead-${completion.value}-${i}`}
              className={className}>
              {completion.value}
            </li>
          );
        })}
      </ul>
    );
  },

  onInputChange(val){
    this.setState((state) => Object.assign(state, {
      value: val,
    }));
  },

  onKeyDown(e){
    if(e.keyCode === UP_KEY) { return this.cycleCompletions(-1); }
    if(e.keyCode === DOWN_KEY) { return this.cycleCompletions(1); }

    if(e.keyCode !== ESC_KEY && e.keyCode !== TAB_KEY) { return; }
    const {value} = this.state;
    this.props.onSubmit(value)
  },

  cycleCompletions(dir){
    const {completions} = this.state;
    const activeCompletion = _.find(completions, (c) => c.active);

    //clear active completion
    let index = completions.indexOf(activeCompletion);

    //In the case nothing is selected an we are moving backwards
    //we select the last item in the list (0 + -1)
    if(index === -1 && dir === -1) { index = 0; }

    const nextIndex = arrayBoundWrap(index + dir, completions.length);

    const newCompletions = completions.map((c, i) => Object.assign(c, {
      active: (i === nextIndex),
    }))

    this.setState((state) => Object.assign(state, {
      completions: newCompletions,
    }));
  }

});
