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
  ] ++ gitAndRepoTooling ++ containerTooling ++ customTools;
  shellHook = ''
    ${ pre-commit.shellHook }
    export NIX_PATH="nixpkgs=${pkgs.path}:."
    export NIXPKGS=${pkgs.path}
    export SSL_CERT_FILE=/etc/ssl/certs/ca-bundle.crt
    export KUBECTL_EXTERNAL_DIFF=delta
  '';
}
