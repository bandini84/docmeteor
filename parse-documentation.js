// Filesystem
var fs = require('fs');
// Path
var path = require('path');
// Get current path
var currentPath = path.resolve();
// Path of this script - Used by creating app from templates
var scriptPath = path.dirname(require.main.filename);

// TODO: Make a true nested tree of the source code...
// TODO: Add filename and where
// [{filename: '', where: '', data: []}, { .. }];

var parseCode = function(code, filename, where) {
  var inComment = false;
  var inInlineComment = false;
  var inTextSingle = false;
  var inTextDouble = false;
  var inCommentTextSingle = false;
  var inCommentTextDouble = false;
  var inCommentBracket = 0;
  var inCommentHandlebar = 0;
  var inCommentParantes = 0;
  var lastWhitespace = false;
  var i = 0;
  var currentObject; // { type: '', text: ''}
  var currentIsToken = false;
  var elements = [];



  var isNext = function(text) {
    var isMatch = false;
    // Make a simple test
    if (code[i] == text[0]) {
      isMatch = true;
      for (var a = 1; a < text.length && isMatch; a++) {
        if (code[i + a] != text[a]) {
          isMatch = false;
        }
      }
    }
    // if (isMatch) {
    //   i += text.length-1;
    // }
    return isMatch;
  };

  var isWhiteSpace = function(pChar) {
    var c = pChar || code[i];
    var inCapsule = inCommentBracket || inCommentHandlebar || inCommentParantes;
    return (c == ' ' && !inCommentTextSingle && !inCommentTextDouble && !inCapsule);
  };

  var isEmpty = function(obj) {
    var count = 0;
    for (var item in obj) {
      if (obj.hasOwnProperty(item)) {
        count++;
      }
    }
    return (count === 0);
  };

  var currentLineNr = 0;
  var lineCount = 1;
  var addCharToType = function(c, type, property, limitWhiteSpace) {
    var line = currentObject && currentObject[type] && currentObject[type][currentLineNr];
    var text = line && line[property] || '';
    var last = text && text[text.length-1] || ' ';
    var lastIsWhiteSpace = isWhiteSpace(last);
    var chIsWhiteSpace = isWhiteSpace(c);
    var doLimitWhiteSpace = (limitWhiteSpace && chIsWhiteSpace && lastIsWhiteSpace);
    var firstIsWhiteSpace = (chIsWhiteSpace && !text.length);

    if (ch == '\n') {
      lineCount++;
      if (line) {
        currentLineNr++;
      }
    } else {
      text += ((doLimitWhiteSpace || firstIsWhiteSpace) ? '' : c);

      // Check if we have got some text to add
      if (text.length) {
        // Check if the currentObject is rigged
        if (!currentObject) {
          currentObject = {};
          currentObject[type] = [];
        }
        // Check if type is the same if not then push and create a new
        if (!currentObject[type]) {
          elements.push(currentObject);
          currentLineNr = 0;
          currentObject = {};
          currentObject[type] = [];
        }
        // Check that the line exists
        if (!currentObject[type][currentLineNr]) {
          currentObject[type][currentLineNr] = {line: lineCount};
        }

        // We add the property data to the node        
        currentObject[type][currentLineNr][property] = text;

      }

    }

  };

  var addChar = function(pChar) {
    if (!currentIsToken) {
      
      var c = pChar || code[i];

      // Normal comment
      if (inComment && !inInlineComment) {
        addCharToType(c, 'block-comment', 'text');
      }
      // Pure inline-comment - we could have line comments in block comments
      if (inInlineComment && !inComment) {
        addCharToType(c, 'inline-comment', 'text');
      }
      if (inInlineComment && inComment) {
        addCharToType(c, 'block-comment', 'comment');
      }
      if (inTextSingle) {
        addCharToType(c, 'text-single', 'text');
      }
      if (inTextDouble) {
        addCharToType(c, 'text-double', 'text');
      }
      // So if not a comment or text it must be code?
      if (!inComment && !inInlineComment && !inTextSingle && !inTextDouble) {
        addCharToType(c, 'code', 'text', true);      
      }

    }

  };


  while (i < code.length) {
    var ch = code[i];
    currentIsToken = false;

    if (isNext('\\')) {
      addChar();
      i++;
    }

    if (isNext('\n')) { // Is newline
      inInlineComment = false;
    } else {

      if (inComment || inInlineComment) {
        if (!inCommentTextDouble && !inCommentTextSingle) {

          if (isNext('(')) {
            inCommentParantes++;
          }
          if (isNext(')')) {
            inCommentParantes--;
            if (inCommentParantes < 0) {
              inCommentParantes = 0;
            }
          }
          if (isNext('[')) {
            inCommentBracket++;
          }
          if (isNext(']')) {
            inCommentBracket--;
            if (inCommentBracket < 0) {
              inCommentBracket = 0;
            }
          }
          if (isNext('{')) {
            inCommentHandlebar++;
          }
          if (isNext('}')) {
            inCommentHandlebar--;
            if (inCommentHandlebar < 0) {
              inCommentHandlebar = 0;
            }
          }
          
        } // EO not in comment text


        if (ch == '"' && !inCommentTextSingle) {
          inCommentTextDouble = !inCommentTextDouble;
        }
        if (ch == "'" && !inCommentTextDouble) {
          inCommentTextSingle = !inCommentTextSingle;
        }
      } else {
        if (ch == '"' && !inTextSingle) {
          i++;
          inTextDouble = !inTextDouble;
        }
        if (ch == "'" && !inTextDouble) {
          i++;
          inTextSingle = !inTextSingle;
        }
      }

      if (isNext('/*') && !inTextSingle && !inTextDouble && !inInlineComment) {
        i ++;
        inComment = true;
        currentIsToken = true;
      }

      if (isNext('*/') && !inTextSingle && !inTextDouble && !inInlineComment) {
        i ++;
        inComment = false;
        currentIsToken = true;
      }

      if (isNext('//') && !inTextSingle && !inTextDouble && !inCommentBracket && !inCommentHandlebar && !inCommentParantes) {
        i ++;
        currentIsToken = true;
        inInlineComment = true;
      }

      if (currentIsToken) {
        var inCommentBracket = 0;
        var inCommentHandlebar = 0;
        var inCommentParantes = 0;
      }

    } // EO not new line

    addChar();

    i++;
  }

  // This call will add the last line to elements
  elements.push(currentObject);

  return elements;
};


var parse = function(filename, where) {
  console.log('Parse file: ' + filename);
  if (fs.existsSync(filename)) {
    var code = fs.readFileSync(filename, 'utf8');
    var elements = new parseCode(code, where);
    return {
      filename: filename,
      where: where,
      elements: elements
    };
  } else {
    console.log('Error: Could not load file: "' + filename + '", file not found!');
    process.exit();
  }

};

module.exports = {
  parse: parse
};