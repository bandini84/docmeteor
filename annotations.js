var commands = {
  '@constructor': ['comment'],
  '@author': ['name'],
  '@deprecated': ['comment'],
  '@exception': ['type', 'comment'],
  '@param': ['type', 'name', 'comment'],
  '@private': ['comment'],
  '@return': ['type', 'comment'],
  '@returns': ['type', 'comment'],
  '@see': ['comment'],
  '@this': ['name', 'comment'],
  '@throws': ['type', 'comment'],
  '@version': ['version', 'comment'],
  '@method': ['name', 'comment'],
  '@override': ['comment'],
  '@const': ['comment'],
  '@type': ['type', 'comment'],
  '@extends': ['type', 'comment'],
  '@callback': ['namepath', 'comment'],
  '@reactive': ['comment'],
  '@where': ['where', 'comment'],
  '@copyright': ['copyrightText'],

};

  var currentCommand = '';
  var currentCommandParams = [];

  var addParamToCommand = function(word) {
    if (currentCommand) {
      if (commands[currentCommand].length == currentCommandParams.length) {
        var comment = currentCommandParams.pop();
        currentCommandParams.push(comment + ' ' + word);
      } else {
        currentCommandParams.push(word);
      }
    }
  };

  var addCommandToDocumentTree = function() {
    var result = {};
    result[currentCommand] = {};
    for (var i = 0; i < currentCommandParams.length; i++) {
      var key = commands[currentCommand][i];
      result[currentCommand][key] = currentCommandParams[i];
    }
    documentTree.push(result);
  };