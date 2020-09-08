{ pkgs, src, excludes ? [] }:
with pkgs;

let

  pre-commit = import (builtins.fetchTarball "https://github.com/blaggacao/pre-commit-hooks.nix/tarball/master");
  # pre-commit = import (builtins.fetchTarball "https://github.com/cachix/pre-commit-hooks.nix/tarball/master");

  kubeval-wrapper = writeShellScript "kubeval-wrapper" ''
    set -o pipefail
    paths=()
    for file in "$@"; do
      path=$(dirname "$file")
      parent=$(dirname "$path")
      while [ -f "$parent/kustomization.yaml" ] || [ -f "$parent/kustomization.yml" ] || [ -f "$parent/Kustomization" ]; do
        path="$parent"
      done
      paths+=($path)
    done
    for dir in $(echo "''${paths[@]}" | tr ' ' '\n' | sort -u | tr '\n' ' '); do
      ${kustomize}/bin/kustomize build "$dir" | ${kubeval}/bin/kubeval  --strict  --ignore-missing-schemas
    done
  '';

in
pre-commit.run {

  inherit src;
  default_stages = [ "manual" "push" ];

  excludes = [
    "^k8s/kustomize/"
  ] ++ excludes;

  settings = {
    nix-linter.checks = [
      "BetaReduction" # normally disabled by default
      "DIYInherit"
      "EmptyInherit"
      "EmptyLet"
      "EmptyVariadicParamSet" # normally disabled by default
      "EtaReduce"
      "FreeLetInFunc"
      "LetInInheritRecset"
      "ListLiteralConcat"
      "NegateAtom"
      "SequentialLet"
      "SetLiteralUpdate"
      "UnfortunateArgName"
      "UnneededAntiquote" # normally disabled by default
      "UnneededRec"
      "UnusedArg"
      "UnusedLetBind"
      "UpdateEmptySet"
    ];
  };

  hooks = {

    nixpkgs-fmt.enable = true;
    nix-linter.enable = true;
    shellcheck.enable = true;

    shfmt = {
      enable = true;
      name = "shfmt";
      description = "Format Shell files";
      entry = "${shfmt}/bin/shfmt -w -l";
      types = [ "shell" ];
    };

    prettier = {
      enable = true;
      name = "prettier";
      description = "Format JS, HTML, CSS, GraphQL, Markdown & YAML files";
      entry = "${nodePackages.prettier}/bin/prettier --write --list-different";
      files = "\\.(css|less|scss|graphql|gql|html|js|jsx|json|md|markdown|mdown|mkdn|mdx|ts|tsx|vue|yaml|yml)$";
      types = [];
    };

    kubeval = {
      enable = true;
      name = "kubeval";
      description = "Validate kustomize";
      entry = kubeval-wrapper.outPath;
      files = "^k8s/.*?/(0-bases/2-deploy|1-DEV\.env|2-STAGING\.env|3-PROD\.env)/.*?\\.(yaml|yml)$";
      pass_filenames = true;
      types = [];
    };

  };

}
