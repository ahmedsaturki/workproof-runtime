# Repository Bootstrap

## Target repository

`ahmedsaturki/workproof-runtime`

The GitHub connector available to this workspace can read and mutate existing repositories, branches, files, commits, and pull requests, but it does not expose repository-creation permission/action. The remote repository therefore must be created once by the owner.

## Create the empty repository

Create a new GitHub repository named:

`workproof-runtime`

Do not initialize it with a README, .gitignore, or license; this workspace already contains them.

## After creation

From the root of this workspace:

```bash
git remote add origin git@github.com:ahmedsaturki/workproof-runtime.git
git push -u origin main
```

The current branch may be renamed to `main` before the first push if desired:

```bash
git branch -M main
```

## Current source-of-truth rule

Until the remote exists, this local repository and its verified archives are the source of truth. Do not create a second competing repository for the same codebase.
