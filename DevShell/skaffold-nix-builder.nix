{ pkgs }:
with pkgs;

writeShellScriptBin "skaffold-nix-builder" ''
  set -e

  repo=$(echo "$IMAGE" | cut -d':' -f 1)
  tag=$(echo "$IMAGE" | cut -d':' -f 2)
  out="$(mktemp -u)"
  nix-build "$BUILD_CONTEXT/Nixfile.nix" -A "images.$repo" -o "$out" --arg image-tag "\"$tag\""
  ${docker}/bin/docker load -i $out

  if $PUSH_IMAGE; then
      ${docker}/bin/docker push $IMAGE
  fi
''
