#!/bin/bash

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

if [[ $STAGED_ENVIRONMENT = true ]]; then
  DEPLOY_SCRIPT=deploy-gitter-staging.sh
else
  DEPLOY_SCRIPT=deploy-gitter.sh
fi

TARBALL_URL=${BUILD_URL}artifact/output/app.tar.gz 
ASSETS_TARBALL_URL=${BUILD_URL}artifact/output/assets.tar.gz 
GIT_COMMIT=$(cat $SCRIPT_DIR/../output/app/GIT_COMMIT)
GIT_BRANCH=$(cat $SCRIPT_DIR/../output/app/GIT_BRANCH)
TAG=$(cat $SCRIPT_DIR/../output/app/ASSET_TAG)
EXTRA_VARS=assets_location="${ASSETS_TARBALL_URL} tag=$TAG tarball_location=${TARBALL_URL}"

cat <<EOD
TARBALL_URL=${TARBALL_URL}
ASSETS_TARBALL_URL=${ASSETS_TARBALL_URL}
GIT_COMMIT=${GIT_COMMIT}
GIT_BRANCH=${GIT_BRANCH}
TAG=${TAG}
EXTRA_VARS=${EXTRA_VARS}
DEPLOY_SCRIPT=${DEPLOY_SCRIPT}
EOD
