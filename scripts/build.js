
// for i in BuildServices.txt ...

// set -e

// echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin
// docker build -t $DOCKER_USERNAME/${SERVICE_NAME}:$VERSION .
// docker images
// docker tag $DOCKER_USERNAME/${SERVICE_NAME}:$VERSION $DOCKER_USERNAME/${SERVICE_NAME}:latest
// docker push $DOCKER_USERNAME/${SERVICE_NAME}:$VERSION
// docker push $DOCKER_USERNAME/${SERVICE_NAME}:latest