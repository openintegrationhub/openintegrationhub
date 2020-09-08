{ pkgs }:
with pkgs;

{

  kapp = stdenv.mkDerivation rec {
    name = "kapp";
    version = "0.34.0";
    src = fetchurl {
      url = "https://github.com/k14s/kapp/releases/download/v${version}/kapp-linux-amd64";
      hash = "sha256-PKItfbFkV/G0FXFiiIwNazvCq3CSIMCIn15SoIdi6/A=";
      executable = true;
    };
    phases = [ "installPhase" "patchPhase" ];
    installPhase = ''
      mkdir -p $out/bin
      cp $src $out/bin/kapp
    '';
  };

  kubebox = stdenv.mkDerivation rec {
    name = "kubebox";
    version = "0.8.0";
    src = fetchurl {
      url = "https://github.com/astefanutti/kubebox/releases/download/v${version}/kubebox-linux";
      sha256 = "sha256-VhKrCCGJeiBTwSGWajspx9u8uZH26Z3ZpkV5x5Zn6y0=";
      executable = true;
    };
    phases = [ "installPhase" "patchPhase" ];
    installPhase = ''
      mkdir -p $out/bin
      cp $src $out/bin/kubebox
    '';
  };

  kube-score = stdenv.mkDerivation rec {
    name = "kube-score";
    version = "1.7.2";
    src = fetchurl {
      url = "https://github.com/zegl/kube-score/releases/download/v${version}/kube-score_${version}_linux_amd64";
      hash = "sha256-tnvmp7b87mg0HzrbecyIjneVeo8sehtcVxOOeXtY6BA=";
      executable = true;
    };
    phases = [ "installPhase" "patchPhase" ];
    installPhase = ''
      mkdir -p $out/bin
      cp $src $out/bin/kube-score
    '';
  };

  container-structure-test = stdenv.mkDerivation rec {
    name = "container-structure-test";
    version = "1.9.0";
    src = fetchurl {
      url = "https://storage.googleapis.com/container-structure-test/v${version}/container-structure-test-linux-amd64";
      hash = "sha256-om8hzF6vENU1hfp5pUNOPYu6C81hXgp1NaO9zJVGjLI=";
      executable = true;
    };
    phases = [ "installPhase" "patchPhase" ];
    installPhase = ''
      mkdir -p $out/bin
      cp $src $out/bin/container-structure-test
    '';
  };

}
