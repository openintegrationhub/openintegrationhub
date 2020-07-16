#!/bin/bash

set -e

# Absolute path this script is in, thus /home/user/bin
SCRIPTPATH=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

function writeEnvFile {
    echo "IAM_TOKEN=$TOKEN" > "$SCRIPTPATH"/greetings.txt
}

writeEnvFile