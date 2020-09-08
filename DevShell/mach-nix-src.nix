# { pkgs }:
let
  mach-nix = (
    builtins.fetchGit {
      url = "https://github.com/DavHau/mach-nix/";
      ref = "2.3.0";
    }
  );
in
import mach-nix
