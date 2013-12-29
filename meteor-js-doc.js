// Filesystem
var fs = require('fs');
// Path
var path = require('path');
// Get current path
var currentPath = path.resolve();
// Path of this script - Used by creating app from templates
var scriptPath = path.dirname(require.main.filename);

var packageFolder = fs.existsSync('package.js');

var documentFile = require('./parse-documentation.js');

var packageJS = {};

if (packageFolder) {
  // Prepare the package.js for node.js docmeteor...
  var prependJS = 'var exportObject = {}, Package = {describe: function(obj) {exportObject.describe = obj;},on_use: function(fn) {exportObject.on_use = fn;},on_test: function(fn) {exportObject.on_test = fn;}};\n';
  var appendJS = '\nmodule.exports = exportObject;';
  var destinationFilename = path.join(scriptPath, 'codepackage.js');
  // Ok we are in a package folder, we try to load the package.js...
  var code = fs.readFileSync('package.js', 'utf8');
  // Load the code and append a simple export
  code = prependJS + code + appendJS;
  // Copy the package.js into the scriptPath + 'codepackage.js'
  fs.writeFileSync(destinationFilename, code, 'utf8');
  // Load the codepackage.js
  packageJS = require(destinationFilename);

  // This object will contain the package information as an object
  var packageObject = {};

  // Expects a string or array - returns array
  var toArray = function(textArray) {
    if (textArray === ''+textArray) {
      return [textArray];
    }
    return textArray;
  };

  // Extends where - unifying multiple file uses
  var extendWhere = function(current, where) {
    var result = (current)?current:[];
    for (var b = 0; b < where.length; b++) {
      result.push(where[b]);
    }
    return result;
  };

  // Add deps to the package object
  var addToPackageObject = function(name, deps, where) {
    var deps = toArray(deps);
    var where = (where)?toArray(where):['client', 'server'];
    // Make sure name is created
    packageObject[name] = (packageObject[name])?packageObject[name]:{};
    for (var i = 0; i < deps.length; i++) {
      packageObject[name][deps[i]] = extendWhere(packageObject[name][deps[i]], where);
    }
  };

  // Package js will use this api to fill the package object
  meteorPackageApi = {
    use: function(packages, where) {
      addToPackageObject('use', packages, where);
    },
    add_files: function(files, where) {
      addToPackageObject('files', files, where);
    },
    export: function(symbols, where) {
      addToPackageObject('exports', symbols, where);
    },
    imply: function(packages, where) {
      addToPackageObject('imply', packages, where);
    }
  };

  // Get the setup for usage
  packageJS.on_use(meteorPackageApi);

  packageObject.describe = packageJS.describe;

  console.log(packageObject);

  documentElements = [];

  if (packageObject.files) {
    for (var filename in packageObject.files) {
      var where = packageObject.files[filename];
      if (packageObject.files.hasOwnProperty(filename)) {
        documentElements.push(documentFile.parse(filename, where));
      }
    }
    console.log('DOCUMENT ELEMENTS:___________');
    console.log(JSON.stringify(documentElements, null, ' '));
  } else {
    console.log('No files in package.js');
    process.exit();
  }

} else {
  // Load js files into source files - should we do a recursive search excluding .* folders and files?
  // TODO: Add source files etc. for apps...
}

module.exports = {
  parse: function() {}
};