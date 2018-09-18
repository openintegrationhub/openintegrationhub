FROM icr_ubuntubase

#RUN apt-get update

# These are all dependencies for nodegit
#RUN apt-get install -y g++
#RUN apt-get install -y libstdc++-8-dev
#RUN apt-get install -y libssl-dev
#RUN apt-get install -y libssh2-1-dev
#RUN apt-get install -y libcurl4-openssl-dev
#RUN apt-get install -y libcurl4-gnutls-dev
#RUN apt-get install -y libgcrypt-dev
RUN apt-get install -y gnupg2

# Now we are installing NodeJS
RUN curl -sL https://deb.nodesource.com/setup_8.x | bash -
RUN apt-get install -y nodejs

RUN npm install -g nodemon

# we create an unprivileged user called icr
RUN useradd --user-group --create-home --shell /bin/false icr

# set working directory
WORKDIR /usr/src/app

# use changes to package.json to force Docker not to use cache
#COPY package.json ./package.json
COPY package.json /usr/src/app
RUN npm install

# copy the sources from the host
#COPY ./app/ .
COPY . /usr/src/app

#RUN chown -R icr:icr $HOME/*

#USER icr

#COPY . .

CMD ["node", "server.js"] # will be overridden while development by docker-compose
#CMD ["bash"]
