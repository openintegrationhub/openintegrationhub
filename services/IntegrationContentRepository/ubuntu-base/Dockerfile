FROM ubuntu:latest

ENV DEBIAN_FRONTEND noninteractive

# install needed packages

USER root

RUN apt-get clean && apt-get update && apt-get install -y curl
#RUN apt-get install -y libstdc++-4.9-dev
#RUN apt-get install -y libssl-dev


CMD ["bash"]
