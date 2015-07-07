#!/bin/bash -ex

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

export DOCKER_HOST=tcp://192.168.99.100:2376
export DOCKER_CERT_PATH=~/.docker/machine/machines/dev
export DOCKER_TLS_VERIFY=1

docker run -d -p 7474:7474 --name graphdb kbastani/docker-neo4j
