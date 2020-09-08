# DevShell

This repository holds a reproducible shell environment with all the tools included
necesary for developing within the openintegrationhub organization.

This tooling is only available on *nix systems.

# Usage

1. Ensure the nix package manager is installed.
  - shorthand: [`sh <(curl -L https://nixos.org/nix/install) --daemon`](https://nixos.org/guides/install-nix.html)
2. Optional: install `direnv` to automatically activate the environment
   when you enter an direnv-enabled repo like this one.
   - shorthand: `nix-env -iA nixpkgs.direnv`
   - then do `direnv allow` to enable the automations of this repo
3. Alternative: execute `nix-shell` manually at the root of this repo.


# Syncing orgniazation-wide DevShells

In order to keeping DevShells for various openintegrationhub repositories in sync,
all functionality is well encapuslated in this subfolder and it's api obeys
to the function arguments in the first line of the `default.nix` file.

Therefore, this folder can be synchronized to a standalone repo via

&rarr; `git suprepo init --remote="<previously created github repo> DevShell`

after amendments to this folder has been made, those can be pushed to this
repo via

&rarr; `git subrepo push DevShell`

then &mdash; in another repo &mdash; those amendments can be pulled in again
with

&mdash; `git subrepo pull DevShell` &mdash; given a subrepo has been initialized
there with `git subrepo init [...]`.

**A word of warning** &mdash; `git subrepo` is a brittle solution and works well
for this use case, where most of the work is done within a monoreop, while some
spill over to other repos are desired. It is not very suitable for a general
replacement of `git submodules` &mdash; although it claims to be one.

