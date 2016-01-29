#!/bin/bash -eux

function join { local IFS="$1"; shift; echo "$*"; }

WORKSPACE=${WORKSPACE-$(pwd)}
DEBUG=${DEBUG-}
export WORKSPACE
export DEBUG

echo $WORKSPACE

ISOLATED_UNIQ_ID=${BUILD_NUMBER:-$(date +"%Y-%m-%dT%H:%M:%S")}
JOB=${TEST_JOB-test}

function finish {
  docker-compose -p "webapp-${ISOLATED_UNIQ_ID}" -f docker-compose.jenkins.yml stop
  docker-compose -p "webapp-${ISOLATED_UNIQ_ID}" -f docker-compose.jenkins.yml rm -f
}
trap finish EXIT

docker-compose -p "webapp-${ISOLATED_UNIQ_ID}" -f docker-compose.jenkins.yml build mongo1 sentineltest1 "${JOB}"
docker-compose -p "webapp-${ISOLATED_UNIQ_ID}" -f docker-compose.jenkins.yml run --entrypoint "$(join ' ' "$@")" "${JOB}"
