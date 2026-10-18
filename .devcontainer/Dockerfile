# syntax=docker/dockerfile:1

FROM debian:forky@sha256:716a7ceeaf1557c357a3c484839176dab750fbda0c5d0530dbbb18f94ccf826b

ARG USER_ID=1000
ARG USER_NAME=dev

RUN apt-get update && apt-get install -y --no-install-recommends sudo git curl ca-certificates nodejs npm

RUN useradd -ms /bin/bash -u ${USER_ID} ${USER_NAME} \
 && echo "${USER_NAME} ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/${USER_NAME} \
 && chmod 0440 /etc/sudoers.d/${USER_NAME}

USER ${USER_NAME}
