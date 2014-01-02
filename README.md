Doc Meteor
===========

This is a simple CLI for updating documentation using `jsdoc` and `gh-pages` as destination.
This tool is optimized code documentation for `Meteor.js` `packages` - *It looks for package.js*

##Installation:
```
$ npm install docmeteor
```

##Usage:
```bash
$ docmeteor
```
This creates two files:
* `api.md` - The exported api
* `internal.api.md` - All code documentation

###Inline comments
Two or more inline comments will be considered as documentation and will be added. Use it as literal in code markdown documentation style.
```
// #Headline
// _This_ is a *document* test
```

###Block comments
Block comments can use annotations. `docmeteor` reads the `package.js` to find the exported scope.
```
/** This is just a simple method
  * @method ExportedScope.foo
  */
```

###Current annotations
```js
var types = {
  // Basic descriptors
  '@method': ['name', 'comment'],
  '@property': ['name', 'comment'],
  '@callback': ['name', 'comment'],
  '@where': ['where', 'comment'], // {client|server}, {client}, {server}
  
  '@constructor': ['comment'], // Expect `new`
  '@param': ['type', 'name', 'comment'], // Parametres
  '@return': ['type', 'comment'],
  '@reactive': ['comment'], // If a reactive method
  '@deprecated': ['comment'], // TODO: Not used
  '@type': ['type', 'comment'],
  '@namespace': ['name', 'comment'],
  '@ejsontype': ['name', 'comment']

  // Could deprecate:
  '@returns': ['type', 'comment'],
  '@this': ['name', 'comment'],
  '@self': ['name', 'comment'],

  // Could be better implemented or deprecated
  '@see': ['comment'], // TODO: Not used
  '@author': ['name'], // TODO: Not used
  '@const': ['comment'], // TODO: Not used
  '@private': ['comment'], // TODO: Not used
  '@override': ['comment'], // TODO: Not used
  '@throws': ['type', 'comment'], // TODO: Not used
  '@copyright': ['copyrightText'], // TODO: Not used
  '@extends': ['type', 'comment'], // TODO: Not used
  '@exception': ['type', 'comment'], // TODO: Not used
  '@version': ['version', 'comment'], // TODO: Not used
};
```
*Not all are used it the current layout template, others migth deprecate - making this tool more lightweight*

Contributions are welcome,

Kind regards Morten, aka @raix
