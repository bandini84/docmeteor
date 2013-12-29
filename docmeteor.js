#!/usr/bin/env node
/*

  We create jsdoc into gh-pages submodule in folder "docs" and auto push changes

*/


// CLI Options
var program = require('commander');
// CLI Colored text
var colors = require('colors');
// CLI Progress bar
var ProgressBar = require('progress');
// Filesystem
var fs = require('fs');
// Path
var path = require('path');
// Queue
//var Queue = require('./queue');
// Get current path
var currentPath = path.resolve();
// Path of this script - Used by creating app from templates
var scriptPath = path.dirname(require.main.filename);
// Templates folder
var templatePath = path.join(scriptPath, path.sep, 'templates');
// Custom Meteor Doc parser
var mjsdoc = require('./meteor-js-doc.js');

program
  .version('0.0.3')
  .option('-c, --create', 'Add gh-pages as submodule folder "docs"')
  .option('-u, --update', 'Init/update submodule folder "docs"')
  .option('-m, --message <message>', 'Commit message, defaults to "auto updated documentation"')
  .option('-e, --exclude', 'Dont include "README.md", default includes "README.md" if found')


  .parse(process.argv);

// Open package.js
// Analyse what files are client and server
// Generate an api onbject model inspired by Meteor's
var commitMessage = (program.message || 'auto updated documentation');

var modulesFound = fs.existsSync('.gitmodules');
var gitignoreFound = fs.existsSync('.gitignore');
var docFolderFound = fs.existsSync('docs/index.html');
var includeReadme = fs.existsSync('README.md') && !program.exclude;

var templateName = ''; // TODO: Make a pretty themed output?

var sourceFiles = ['.'];
if (includeReadme) {
  sourceFiles.push('README.md');
}

var docsModuleInstalled = false;

if (modulesFound) {
  var text = fs.readFileSync('.gitmodules', 'utf8');
  docsModuleInstalled = (text.indexOf('[submodule "docs"]') > -1);
}

var getSourceFiles = function() {
  return sourceFiles.join(' ');
};

var getRepoUrl = function(done) {
  var exec = require('child_process').exec;
  exec('git config --get remote.origin.url', function(err, stin) {
    if (err) {
      console.log('Requires to be run inside a git repository folder');
      process.exit();
    } else {
      done(stin.replace('\n', ''));
    }
  });
}

var getBranch = function(done) {
  var exec = require('child_process').exec;
  exec('git branch -a --no-color', function(err, stin) {
    if (err) {
      console.log('Requires to be run inside a git repository folder');
      process.exit();
    } else {
      var list = stin.split('\n');
      var branch = '';
      var ghBranchExists = false;
      for (var i = 0; i < list.length; i++) {
        if (list[i][0] == '*') {
          branch = list[i].substr(2);
        }
        if (list[i].substr(list[i].length-8) == 'gh-pages') {
          ghBranchExists = true;
        }
      }
      // done(branch, ghBranchExists); // TODO: playing this is disabled
    }
  });
}

addModule = function(done) {
  getRepoUrl(function(url) {
    if (url.length > 0) {
      console.log('Adding gh-pages as submodule in "docs"');
      var exec = require('child_process').exec;
      exec('git submodule add -b gh-pages ' + url + ' docs', function(err, stin) {
        if (err) {
          console.log('Could not add gh-pages as submodule');
          process.exit();
        } else {
          // TODO: Better check?
          initModule(done);
        }
      });    
    } else {
      console.log('Cannot create: Please commit your code, and try again');
    }
  });
};

initModule = function(done) {
  var exec = require('child_process').exec;
  exec('git submodule init; git submodule', function(err, stin) {
    if (err) {
      console.log('Cannot init submodule');
      process.exit();
    } else {
      done(stin);
    }
  });  
};

runJsDoc = function(done) {
  var exec = require('child_process').exec;
  // <path/to/jsdoc>/jsoc mysourcefiles/* -t <path.to.unzipped>/template -c <path.to.unzipped>/conf.json -d <path.to.output>/
  var templateString = '';

  if (templateName.length > 0) {
    var tempPath = path.join(templatePath, templateName, 'template');
    var configPath = path.join(templatePath, templateName, 'conf.json');
    templateString = ' -t ' + tempPath + ' -c ' + configPath;
  }

  exec('jsdoc ' + getSourceFiles() + ' -d docs' + templateString, function(err, stin) {
    if (err) {
      console.log('Error while running jsdoc:');
      console.log(err);
      process.exit();
    } else {
      if (stin.length > 0) {
        console.log('Error while running jsdoc:\n' + stin);
        process.exit();
      } else {
        done();
      }
    }
  });
};

runJsDocJSON = function(filename, done) {
  var exec = require('child_process').exec;

  exec('jsdoc ' + getSourceFiles() + ' -t templates/haruki -d console -q format=json', function(err, stin) {
    if (err) {
      console.log('Error while running jsdoc to json:');
      console.log(err);
      process.exit();
    } else {
      if (stin.length == 0) {
        console.log('Error while running jsdoc to json');
        process.exit();
      } else {
        try {
          var apiObject = JSON.parse(stin); 
          fs.writeFileSync(filename, stin, 'utf8');
          done();
        } catch(err) {
          console.log(stin);
          process.exit();
        }
      }
    }
  });
};

commitDocs = function(done) {
  var exec = require('child_process').exec;
  exec('cd docs; git add -A; git commit -am \'' + commitMessage + '\'; git push', function(err, stin) { //  ; cd ..; git submodule update
    if (err) {
      console.log('Could not commit and push api documentation');
      console.log(err);
      process.exit();
    } else {
      done();
    }
  });
};

// Set branch scope
getBranch(function(branch, ghBranchExists) {

  if (branch === 'gh-pages') {
    if (currentPath.length > 5 && currentPath.substr(currentPath.length-5, 5) == '/docs') {
      console.log('You cannot run this command from the "docs" folder, go one level up');
    } else {
      console.log('Cannot use the "gh-pages" branch for this');
    }
    process.exit();
  }

  // If we have modules installed and we have docs folder then update documentation
  if (!program.create && !program.update) {

    if (docsModuleInstalled && docFolderFound) {
      console.log('Running jsdoc on branch "' + branch + '"' + ( (includeReadme)?' includes README.md':'' ));
      runJsDocJSON('api.json', function() {

        runJsDoc(function() {
          console.log('publishing documentation');
          commitDocs(function() {
            console.log('done!');
            process.exit();
          });
        });
        
      });
    }
  }

  if (program.update) {
    if (docsModuleInstalled && !docFolderFound) {
      console.log('Init submodules');
      getRepoUrl(function() {
        initModule(function(stin) {
          console.log('done!');
          process.exit();
        });
      });
    } else {
      if (docFolderFound) {
        console.log('The module seems to be initialized allready');
      } else if (!docsModuleInstalled) {
        console.log('Seems gh-pages is not added as submodule into "docs"?');
        console.log('Use "docmeteor --create"');
      }
      process.exit();
    }
  }

  if (!ghBranchExists) {
    console.log('"gh-pages" branch not found, create before using this command');
    process.exit();
  }
  
  if (program.create) {
    if (docsModuleInstalled) {
      console.log('Seems that the repo allready got submodule in "docs" folder?');
    } else {
      addModule(function(stin) {
        console.log('done');
        process.exit();
      });
    }
  }

});

mjsdoc.parse('.', 'api.json');

