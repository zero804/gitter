#!/bin/bash

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

TARBALL_URL=${BUILD_URL}artifact/output/troupe.tgz 
ASSETS_TARBALL_URL=${BUILD_URL}artifact/output/assets.tgz 
EXTRA_VARS=assets_location="${ASSETS_TARBALL_URL} tag=$TAG tarball_location=${TARBALL_URL}"

if [[ $STAGED_ENVIRONMENT = true ]]; then
  TAG=S$(echo $GIT_COMMIT|cut -c 1-6)
  DEPLOY_SCRIPT=deploy-gitter-staging.sh
else
  TAG=$(echo $GIT_COMMIT|cut -c 1-6)
  DEPLOY_SCRIPT=deploy-gitter.sh
fi

cat <<EOD
TARBALL_URL=${TARBALL_URL}
ASSETS_TARBALL_URL=${ASSETS_TARBALL_URL}
GIT_COMMIT=${GIT_COMMIT}
GIT_BRANCH=${GIT_BRANCH}
TAG=${TAG}
EXTRA_VARS=${EXTRA_VARS}
DEPLOY_SCRIPT=${DEPLOY_SCRIPT}
EOD
