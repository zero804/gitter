#!/usr/bin/env bash

set -euo pipefail

set -x

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

export NO_AUTO_INDEX=1

GITTER_USERNAME=${GITTER_USERNAME:-suprememoocow}
GROUP_URI=${GROUP_URI:-gitterHQ}
GITHUB_REPO_URI=${GITHUB_REPO_URI:-troupe/gitter-webapp}

node ${SCRIPT_DIR}/create-forum.js --username ${GITTER_USERNAME} --group ${GROUP_URI}
node ${SCRIPT_DIR}/create-forum-category.js --username ${GITTER_USERNAME} --group ${GROUP_URI} --name Issues
node ${SCRIPT_DIR}/create-forum-category.js --username ${GITTER_USERNAME} --group ${GROUP_URI} --name FAQs
node ${SCRIPT_DIR}/create-forum-category.js --username ${GITTER_USERNAME} --group ${GROUP_URI} --name Design
node ${SCRIPT_DIR}/../topics-importer/topics-importer.js --groupUri ${GROUP_URI} --repoUri ${GITHUB_REPO_URI}
