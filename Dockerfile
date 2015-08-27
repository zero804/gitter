FROM node:0.10.38
RUN npm install -g npm
RUN npm install -g nodemon
RUN npm install -g node-gyp

RUN mkdir /src

WORKDIR /src
COPY package.json package.json
COPY npm-shrinkwrap.json npm-shrinkwrap.json
COPY modules/ modules/
COPY shared/ shared/

RUN sed 's#http://beta-internal:4873/#http://10.0.0.140:4873/#g' -ibak npm-shrinkwrap.json
RUN npm install --verbose --registry http://10.0.0.140:4873/

COPY . .
# Horrible hack for now
CMD ["nodemon", "web"]
