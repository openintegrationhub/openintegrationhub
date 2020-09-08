{ pkgs, src, preCommitExcludes, repoSpecificTools }:
let
  pre-commit = (
    import ./pre-commit.nix {
      inherit pkgs src;
      excludes = preCommitExcludes;
    }
  );

  # commitizen = (import ./shell/python-builds.nix { inherit pkgs; }).commitizen;
  commitizen = (import ./python-builds.nix).commitizen;
  container-structure-test = (import ./binary-builds.nix { inherit pkgs; }).container-structure-test;
  kapp = (import ./binary-builds.nix { inherit pkgs; }).kapp;
  kubebox = (import ./binary-builds.nix { inherit pkgs; }).kubebox;
  kube-score = (import ./binary-builds.nix { inherit pkgs; }).kube-score;
  skaffold-nix-builder = (import ./skaffold-nix-builder.nix { inherit pkgs; });

  customTools = [
    commitizen
    container-structure-test
    kapp
    kubebox
    kube-score
    skaffold-nix-builder
  ] ++ repoSpecificTools;

  nixTooling = with pkgs; [
    nix # nix package manager -- tagged version
    nixops # gitops for nix (stateful)
    nix-diff # explains why two Nix derivations differ
    nix-tree # interactively browse a Nix store paths dependencies
    nix-prefetch # determine the hash of a fixed-output derivation (TOFU)
    nix-serve # utility for sharing a Nix store as a binary cache
    nix-simple-deploy # deploy & switch NixOS system config (or path) to remote machine
    nix-top # help users figure out what's building
    nixos-container # run nixos in a systemd nspawn container (don't confuse with OCI compliant containers)
  ];

  gitAndRepoTooling = with pkgs; [
    fd
    git
    gitAndTools.delta
    gitAndTools.git-subrepo
    git-town
    just
    ripgrep
    scc
  ];

  containerTooling = with pkgs; [
    dive
    podman
    kube3d
    kubectl
    kubernetes-helm
    kubeval
    kustomize
    lazydocker
    skaffold
  ];

in
pkgs.mkShell {
  buildInputs = with pkgs; [
    cfssl
    drone-cli
  ] ++ nixTooling ++ gitAndRepoTooling ++ containerTooling ++ customTools;
  shellHook = ''
    ${ pre-commit.shellHook }
    export NIX_PATH="nixpkgs=${pkgs.path}:."
    export NIXPKGS=${pkgs.path}
    export SSL_CERT_FILE=/etc/ssl/certs/ca-bundle.crt
    export NIXOPS_ENV=y
    export KUBECTL_EXTERNAL_DIFF=delta
    git config git-town.code-hosting-driver gitea
    git config git-town.code-hosting-origin-hostname git.p1.rocks
    git config git-town.main-branch-name master
  '';
}
