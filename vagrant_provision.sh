#!/usr/bin/env bash

# Add NodeSource APT repo for node 0.10
curl -sL https://deb.nodesource.com/setup_0.10 | sudo bash -

# Install packages
apt-get update
apt-get install -y build-essential nodejs python-pip #linux-image-generic-lts-trusty

# Install Docker
curl -sSL https://get.docker.com/ | sh

# Install docker-compose
pip install -U docker-compose

# Our internal NPM repo
echo "10.0.0.140 beta-internal" >> /etc/hosts

# Make Docker run over TCP/HTTP (for docker-compose)
echo 'DOCKER_OPTS="--dns 8.8.8.8 --dns 8.8.4.4 -H tcp://127.0.0.1:2375"' >> /etc/default/docker
restart docker

# Set env var for docker-compose
echo "export DOCKER_HOST=127.0.0.1:2375" >> /home/vagrant/.profile

# Update npm and install nodemon
npm install -g npm nodemon
