#!/usr/bin/env bash

# Add NodeSource APT repo for node 0.10
curl -sL https://deb.nodesource.com/setup_0.10 | sudo bash -

# Install packages
apt-get update
apt-get install -y build-essential python-pip git-core #linux-image-generic-lts-trusty


# Install nvm and correct node version
git clone https://github.com/creationix/nvm.git /home/vagrant/.nvm
pushd /home/vagrant/.nvm
git checkout `git describe --abbrev=0 --tags`

# Activate NVM
source nvm.sh

# Install nodejs
nvm install 0.12
nvm use 0.12

#Make sure vagrant can use it
echo "source ~/.nvm/nvm.sh" >> /home/vagrant/.bashrc
echo "nvm use 0.12" >> /home/vagrant/.bashrc
popd


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


#Install npm 2 because npm3.x.x breaks everything
# TODO this doesn't update the binary for the vagrant user
# figure out how to do that in a clean manor
npm i -g npm@2

# Update npm and install nodemon
npm install -g npm nodemon

# Make vagrant the owner of all the things (node)
chown -R  vagrant:vagrant /home/vagrant/.nvm
