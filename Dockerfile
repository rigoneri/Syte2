FROM node:6.9.4

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
    nodejs 

RUN npm install -g bower grunt-cli

ADD . /

# setting up client
WORKDIR /client
RUN bower install --allow-root
RUN npm install; exit 0
RUN grunt clean --force
RUN grunt build --force

# setting up server
WORKDIR /
RUN npm install

EXPOSE 3000
WORKDIR /server

RUN cp -r ../client/app/images ./dist/

ENV NODE_ENV="production"
ENTRYPOINT ["node", "app.js"]
