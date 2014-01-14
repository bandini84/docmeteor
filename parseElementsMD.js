// Filesystem
var fs = require('fs');

var annotator = require('./annotations.js').annotator;

module.exports = function(filename, documentElements, packageObject) {
  // filename where the md should be saved...
  // documentElements is the parsed tree
  // packageObject is from the package.js - if found then only show the public
  // exported api...

  var sourceFileCount = documentElements.length;
  var exported = packageObject && packageObject.exports || {};

  var fileText = '';

  var nbsp = function(len) {
    var text = '';
    for (var i=0; i < len; i++) {
      text += '&nbsp;';
    }
    return text;
  };

  var knownTypes = {
    'number': true,
    'boolean': true,
    'string': true,
    'object': true,
    'function': true,
    'null': true,
    'any': true,
    'array': true,
    'binary': true,
    'arraybuffer': true,
    'float32array': true,
    'float64array': true,
    'int32array': true,
    'uint8array': true,
    'buffer': true
  };

  var resolveTypeReference = function(ref) {
    // TODO: Do a real lookup for other types of documentation
    return '#' + ref;
  };

  var linkToType = function(t) {
    var types = (t || '').replace('{', '').replace('}', '').split('|');
    var output = [];
    for (var ti = 0; ti < types.length; ti++) {
      var oneType = types[ti].toLowerCase();
      if (!knownTypes[oneType] && oneType[0] !== '[') { // not [To](link)
        // We have to link to this object? but allow user to do linking
        output.push('[' + types[ti] + '](' + resolveTypeReference(types[ti]) + ')'); 
      } else {
        // We return the original
        output.push(types[ti]);
      }
    }
    return '{' + output.join('|') + '}'
  };

  var renderAST = function(ast, sourceFilename) {
    var headline = '';
    var body = '';
    var reference = '';
    var level1 = '####';

    var name = ast['@callback'] && ast['@callback'].name ||
            ast['@method'] && ast['@method'].name ||
            ast['@property'] && ast['@property'].name || '';

    var isPrototype = false;
    var scopes = name.split('.');
    var prettyName = '';
    var classNames = [];
    for (var p = 0; p < scopes.length-1; p++) {
      if (scopes[p] !== 'prototype') {
        if (p == 0) {
          prettyName += scopes[p].toLowerCase();
        } else {
          prettyName += scopes[p][0] + scopes[p].substr(1).toLowerCase();
        }
        classNames.push(scopes[p]);
      } else {
        isPrototype = true;
      }
    }
    protoName = scopes.pop();
    prettyName = (prettyName)? '*' + prettyName + '*.' + protoName : name;

    (scopes.length > 1)? scopes[scopes.length-2] == 'prototype': false;

    // Title can be a method or variable?
    headline += '\n' + level1 + ' '; // '\n---\n###';

    headline += '<a name="' + name + '"></a>';

    if (ast['@constructor']) headline += 'new ';
    headline += prettyName;
    if (ast['@method']) {
      headline += '(';
      if (ast['@param']) {
        var paramList = [];
        for (var i = 0; i < ast['@param'].length; i++) {
          if (ast['@param'][i].optional || ast['@param'][i].default) {
            var def = ''; // (ast['@param'][i].default) ? '=' + ast['@param'][i].default : '';
            paramList.push('[' + ast['@param'][i].name + def + ']');
          } else {
            paramList.push(ast['@param'][i].name);
          }
        }
        headline += paramList.join(', ');
      }
      headline += ')';
    }

    if (ast['@property']) {
      headline += ' ' + ast['@type'].name;
    }

    headline += nbsp(2) + '<sub><i>' + ast['@where'] + '</i></sub>';

    headline += ' ' + level1 + '\n';
    
    body += '-\n';
    var typeName = (ast['@method']?'method':(ast['@callback'])?'callback':'property');

    if (ast['@deprecated']) {
      body += '> __Warning!__\n';
      body += '> This ' + typeName + ' "' + name + '" has deprecated from the api\n';
      // add note from dev
      if (ast['@deprecated'] !== true && ast['@deprecated'].length) {
        body += '> ' + ast['@deprecated'] + '\n\n';
      }
    }

    if (ast['@private']) {
      body += '*This ' + typeName + ' is private*\n';
    }

    if (classNames.length > 0) {
      var prototypeText = (ast['@prototype'] || isPrototype)? '`prototype` of ':'';
      body += '*This ' + typeName + ' __' + protoName + '__ is defined in ' + prototypeText + '`' + classNames.join('.') + '`*\n';
    }

    if (ast['@ejsontype']) {
      body += 'Adds custom EJSON-type: `' + ast['@ejsontype'].name + '` ';
      body += ast['@ejsontype'].comment || '';
      body += '\n';
    }

    if (ast['@param']) {
      body += '\n__Arguments__\n\n';

      for (var i = 0; i < ast['@param'].length; i++) {
        
        // paramList.push(ast['@param'][i].name);

        body += '* ';
        body += '__' + ast['@param'][i].name + '__';

        body += ' *' + linkToType(ast['@param'][i].type || '{any}') + '*';
        body += '  ';

        if (ast['@param'][i]['default']) {
          body += '  (Optional'
          if (ast['@param'][i]['default']) body += ' = ' + ast['@param'][i]['default'];
          body += ')';
        } else if (ast['@param'][i].optional) { 
          body += '  (Optional)';
        }  
        
        body += '\n';

        if (ast['@param'][i].comment) body += ast['@param'][i].comment + '\n';

        if (ast['@param'][i].children) {
          var children = ast['@param'][i].children;
          for (var c = 0; c < children.length; c++) {
            body += '    - ';
            body += '__' + children[c].name + '__';

            body += ' *' + linkToType(children[c].type || '{any}') + '*';
            body += '  ';

            if (children[c]['default']) {
              body += '  (Default'
              if (children[c]['default']) body += ' = ' + children[c]['default'];
              body += ')';
            } else if (children[c].optional) {
              body += '  (Optional)';
            }  
            body += '\n';
            if (children[c].comment) body += children[c].comment + '\n';
          }
        }

      }

      body += '\n-\n';
    }

    var returns = ast['@return'] || ast['@returns'];
    if (returns) {
      body += '\n';
      body += '__Returns__';
      body += '  ';
      body += '*' + (returns.type || '{any}') + '*';
      if (ast['@reactive']) body += '  __(is reactive)__';
      body += '\n';
      if (returns.comment) body += returns.comment + '\n';

    }

    // If in the internal documentation show the todo list
    var todo = ast['@todo'];
    if (todo && !packageObject && todo.length > 0) {
      body += '\n__TODO__\n';
      body += '```\n';
      for (var ti = 0; ti < todo.length; ti++) {
        if (todo[ti].comment) body += '* ' + todo[ti].comment + '\n';
      }
      body += '```\n';
    }

    var ref = ast['@reference'];
    if (ref) {
      reference += '\n';
      reference += '> ```';
      reference += '' + ref.text + '';
      reference += '```';
      // Make a small link to the actual source
      reference += ' [' + sourceFilename + ':' + ref.line + '](' + sourceFilename + '#L' + ref.line + ')\n';
    }

    //if (body.length) body += '\n---\n';
    //if (body.length) body += '\n';

    return {
      headline: headline,
      body: body,
      reference: reference
    };
  };

  for (var currentFileIndex = 0; currentFileIndex < documentElements.length; currentFileIndex++) {
    var fileElements = documentElements[currentFileIndex];
    var sourceFilename = fileElements.filename;
    var sourceWhere = fileElements.where;
    var elements = fileElements.elements;


    // console.log('FILE: ' + currentFileIndex);
    var countExported = 0;
    var textResult = '';

    var anno = new annotator(sourceFilename, sourceWhere);

    for (var currentElementIndex = 0; currentElementIndex < elements.length; currentElementIndex++) {
      var statements = elements[currentElementIndex];
      if (statements['block-comment'] && statements['block-comment'].length > 1) {
        anno.reset();
        var getNextCodeElement = function() {
          var i = currentElementIndex+1;
          while (i < elements.length && !elements[i]['code']) {
            i++;
          }
          return elements[i];
        };

        var getCodeReference = function() {
          var next = getNextCodeElement(); // elements[currentElementIndex+1];
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
              return {
                name: name,
                text: nextLines[0].text,
                line: nextLines[0].line
              };
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
          // if (line.text[0] == '*') { line.text = line.text.substr(1)}
          line.text = line.text.substr(line.text.indexOf('*')+1);
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

        var ref = getCodeReference();
        if (!ref) {
          // This is a standalone comment...
          //
          // console.log('Filename: ' + sourceFilename);
          // console.log(elements[currentElementIndex+1]);
        } else {
          anno.addName(ref.name);
          anno.addReference(ref.line, ref.text);            
        }

        var ast = anno.getAST();
        // If we have a package object we only show the exported api...
        var isExported = ast['@namespace'] && exported[ast['@namespace'].name];
        var isPrivate = ast['@private'];
        if ((isExported && !isPrivate)|| !packageObject) {
          var rendered = renderAST(ast, sourceFilename);
          var text = rendered.headline;
          text += (before)? '```\n' + before + '```\n' : '';
          text += rendered.body + after + rendered.reference + '\n-\n';

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
      if (statements['markdown-comment']) {
        var lines = statements['markdown-comment'];
        // We skip single line markdown comments
        if (lines.length > 1) {
          if (textResult.length) textResult += '\n-\n';
          for (var l = 0; l < lines.length; l++) {
            var line = lines[l] || { text: '' };
            textResult += line.text + '\n';
          }
      
        }
      }
    }
    if (countExported > 0) {
      if (fileText.length > 0) fileText += '\n\n---\n';
      if (!packageObject) {
        // fileText += '-\n';
        fileText += '> File: ["' + sourceFilename + '"](' + sourceFilename + ')\n';
        fileText += '> Where: ' + '{' + sourceWhere.join('|') + '}' + '\n';
        fileText += '\n-\n';
      }
      
      fileText += textResult;
    }

  }
  console.log('Creating "' + filename + '"');
  fs.writeFileSync(filename, fileText, 'utf8');
};