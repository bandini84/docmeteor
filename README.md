Doc Meteor
===========

This is a simple CLI for updating documentation using `jsdoc` and `gh-pages` as destination.
This tool can be used for javascript in general but will be optimized code documentation for `Meteor.js` `apps` and `packages`.

###Installation:
```
$ npm install docmeteor
```
*Requires `nodejs`, `jsdoc` and `git`*

###Usage:
```
$ docmeteor --help

  Usage: docmeteor [options]

  Options:

    -h, --help               output usage information
    -V, --version            output the version number
    -c, --create             Add gh-pages as submodule folder "docs"
    -u, --update             Init/update submodule folder "docs"
    -m, --message <message>  Commit message, defaults to "auto updated documentation"
```

Update documentation:
`docmeteor` should be run inside the git repo to document.
This will update and commit the code documentation into `gh-pages`.
```bash
$ docmeteor
# or..
$ docmeteor -m 'Added foo documentation'
```

###Rig the folder
1. Create the branch "gh-pages"
2. Run `docmeteor --create` in the `master` branch to add `gh-pages` as a sub folder "docs" containing the documentation

Contributions are welcome,

Kind regards Morten, aka @raix
