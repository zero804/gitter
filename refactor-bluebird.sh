#!/bin/bash

set -e -x

do_grasp() {
  grasp -r -e $1 -i --replace $2 modules/ server/ test/
}

do_grasp "require('q')" "require('bluebird-q')"
do_grasp '$x.thenResolve($value)' '{{x}}.thenReturn({{value}})'
do_grasp '$x.fin($value)' '{{x}}.finally({{value}})'
