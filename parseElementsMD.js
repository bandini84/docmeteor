// Filesystem
var fs = require('fs');

var annotator = require('./annotations.js').annotator;

module.exports = function(filename, documentElements, packageObject) {
  // filename where the md should be saved...
  // documentElements is the parsed tree
  // packageObject is from the package.js - if found then only show the public
  // exported api...

  var sourceFileCount = documentElements.length;
  var exported = packageObject.exports || {};

  var fileText = '';

  var renderAST = function(ast) {
    var headline = '';
    var body = '';

    // Title can be a method or variable?
    headline += '##'
    if (ast['@constructor']) headline += 'new ';
    headline += ast['@property'] && ast['@property'].name || '';
    headline += ast['@method'] && ast['@method'].name || '';
    if (ast['@method']) {
      headline += '(';
      if (ast['@param']) {
        var paramList = [];
        for (var i = 0; i < ast['@param'].length; i++) {
          paramList.push(ast['@param'][i].name);
        }
        headline += paramList.join(', ');
      }
      headline += ')';
    }

    headline += '    *' + ast['@where'] + '*\n';

    if (ast['@param']) {
      body += '__Arguments__\n\n';

      for (var i = 0; i < ast['@param'].length; i++) {
        
        paramList.push(ast['@param'][i].name);

        body += '* ';
        body += '__' + ast['@param'][i].name + '__';
        body += '  ';
        body += '*' + (ast['@param'][i].type || '{any}') + '*\n';
        if (ast['@param'][i].comment) body += ast['@param'][i].comment + '\n';

        if (ast['@param'][i].children) {
          var children = ast['@param'][i].children;
          for (var c = 0; c < children.length; c++) {
            body += '  * ';
            body += '__' + children[c].name + '__';
            body += '  ';
            body += '*' + (children[c].type || '{any}') + '*\n';
            if (children[c].comment) body += children[c].comment + '\n';
          }
        }

      }

    }

    var returns = ast['@return'] || ast['@returns'];
    if (returns) {
      body += '\n';
      body += '__Returns__';
      body += '  ';
      body += '*' + (returns.type || '{any}') + '*';
      if (ast['@reactive']) body += '  *(is reactive)*';
      body += '\n';
      if (returns.comment) body += returns.comment + '\n';

    }

    if (body.length) body += '---\n';

    return {
      headline: headline,
      body: body
    };
  };

  for (var currentFileIndex = 0; currentFileIndex < documentElements.length; currentFileIndex++) {
    var fileElements = documentElements[currentFileIndex];
    var sourceFilename = fileElements.filename;
    var sourceWhere = fileElements.where;
    var elements = fileElements.elements;


    console.log('FILE: ' + currentFileIndex);
    var countExported = 0;
    var textResult = '';

    var anno = new annotator(sourceFilename, sourceWhere);

    for (var currentElementIndex = 0; currentElementIndex < elements.length; currentElementIndex++) {
      var statements = elements[currentElementIndex];
      if (statements['block-comment']) {
        anno.reset();
        var getName = function() {
          var next = elements[currentElementIndex+1];
          if (next && next['code']) {
            var nextLines = next['code'];
            if (nextLines.length) {
              var text = nextLines[0].text;
              // function foo();
              text = text.split('function ')[0].split('(')[0];
              // var bar = function()
              text = text.replace(' =', '=').replace('= ', '=');
              var equal = text.split('=');
              var name = equal[0];
              return name;
            }
          }
        };

        var before = '';
        var after = '';
        var doAfter = false;
        var lines = statements['block-comment'];
        for (var l = 0; l < lines.length; l++) {
          var line = lines[l];
          // Remove the * and posible whitespace
          if (line.text[0] == '*') { line.text = line.text.substr(1)}
          if (line.text[0] == ' ') { line.text = line.text.substr(1)}
          if (line.annotations) {
            doAfter = true;
            for (var a in line.annotations) {
              if (line.annotations.hasOwnProperty(a)) {
                anno.add(a, line.annotations[a]);
              }
            }
          } else if (line.text.length) {
            if (doAfter) {
              after += line.text + '\n';
            } else {
              before += line.text + '\n';
            }
          }
        }

        anno.addName(getName());

        var ast = anno.getAST();
        // If we have a package object we only show the exported api...
        if (ast['@namespace'] && exported[ast['@namespace'].name] || !packageObject) {
          var rendered = renderAST(ast);
          var text = rendered.headline + before + rendered.body + after;

          countExported++;
          textResult += text;
        } else {
          // console.log('NAMESPACE: ' + ast['@namespace'].name);
        }
        // TODO check if the name is in the exported scope
        // If none is exported from this file we return an empty string - not
        // even a single comment.
        // If a just a single method is exported all md inline is also returned
        // but none of the not exported symbol comments...
      }
      if (statements['inline-comment']) {
        var lines = statements['inline-comment'];
        // We skip single line inline comments
        if (lines.length > 1) {
          for (var l = 0; l < lines.length; l++) {
            var line = lines[l];
            textResult += line.text + '\n';
          }
          textResult += '---\n';
      
        }
      }
    }
    if (countExported > 0) {
      fileText += textResult;
    }

  }

  fs.writeFileSync(filename, fileText, 'utf8');
};