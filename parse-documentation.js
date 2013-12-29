// Filesystem
var fs = require('fs');
// Annotations object
var commands = require('./annotations.js');

var parseSource = function(code, filename, where) {
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
  var currentWord = '';
  var i = 0;
  var currentObject; // { type: '', text: ''}
  var currentIsToken = false;
  var elements = [];

  var currentCommand = '';
  var currentCommandParams = [];
  var currentAnnotations = {};


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

    if (c == '\n') {
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
        // We set the current command if set
        if (currentCommand && !currentObject[type][currentLineNr].annotations) {
          currentObject[type][currentLineNr].annotations = currentAnnotations;
        }

      }

    }

  };

  var addChar = function(pChar) {
    if (!currentIsToken) {
      
      var c = pChar || code[i];

      // Rigs annotations
      addCharToWord(c);

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

  var addCharToWord = function(c) {
    // We are on the last item
    var lastItem = (commands[currentCommand] && currentCommandParams.length == commands[currentCommand].length);
    // If new word in comment block
    if ((!c || isWhiteSpace(c)) && inComment && !inInlineComment && !inCommentParantes && !inCommentBracket && !inCommentHandlebar) {
      if (!currentCommand && commands[currentWord]) {
        currentCommand = currentWord;
      } else {
        // If we are in command mode
        if (currentCommand) {
          if (lastItem) {
            currentWord = currentCommandParams.pop() + ' ' + currentWord;
          }
          currentCommandParams.push(currentWord);
        }
      }
      // Start a new word
      currentWord = '';
    } else {
      // Add the char to the current word
      currentWord += c;
    }

    // We set the real object
    if (!c && commands[currentCommand]) {
      var result = {};
      var name = 'unknown';
      for (var index = 0; index < currentCommandParams.length; index++) {
        name = commands[currentCommand][index] || 'unknown';
        result[name] = currentCommandParams[index];
      }
      currentAnnotations[currentCommand] = result;
    }
  };


  while (i < code.length) {
    currentIsToken = false;

    if (isNext('\\')) {
      addChar();
      i++;
    }

    if (isNext('\n')) { // Is newline
      inInlineComment = false;
      // Reset command
      addCharToWord();
      currentCommand = '';
      currentCommandParams = [];
      currentAnnotations = {};    
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


        if (isNext('"') && !inCommentTextSingle) {
          inCommentTextDouble = !inCommentTextDouble;
        }
        if (isNext("'") && !inCommentTextDouble) {
          inCommentTextSingle = !inCommentTextSingle;
        }
      } else {
        if (isNext('"') && !inTextSingle) {
          i++;
          inTextDouble = !inTextDouble;
        }
        if (isNext("'") && !inTextDouble) {
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
        inCommentBracket = 0;
        inCommentHandlebar = 0;
        inCommentParantes = 0;
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
  if (fs.existsSync(filename)) {
    var code = fs.readFileSync(filename, 'utf8');
    var elements = new parseSource(code, where);
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

module.exports = parse;