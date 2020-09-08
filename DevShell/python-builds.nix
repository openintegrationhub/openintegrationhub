# { pkgs }:
# with (import ./mach-nix-src.nix { inherit pkgs; });
with (import ./mach-nix-src.nix);

{
  commitizen = mkPython {
    python = nixpkgs.python38;
    requirements = ''
      commitizen
      setuptools
    '';
  };
}
