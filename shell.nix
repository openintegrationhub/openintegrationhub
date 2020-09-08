let
  nixpkgs-src = import ./nixpkgs-src.nix;
  pkgs = import nixpkgs-src { config = {}; overlays = []; };

  src = ./.;
  preCommitExcludes = (import ./.pre-commit-excludes);
  repoSpecificTools = (import ./repo-specific-tools.nix { inherit pkgs; });

in
import ./DevShell { inherit pkgs src preCommitExcludes repoSpecificTools; }
