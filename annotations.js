var types = {
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
  '@self': ['name', 'comment'],
  '@throws': ['type', 'comment'],
  '@version': ['version', 'comment'],
  '@method': ['name', 'comment'],
  '@property': ['name', 'comment'],
  '@override': ['comment'],
  '@const': ['comment'],
  '@type': ['name', 'comment'],
  '@extends': ['type', 'comment'],
  '@callback': ['name', 'comment'],
  '@reactive': ['comment'],
  '@where': ['where', 'comment'],
  '@copyright': ['copyrightText'],
  '@namespace': ['name', 'comment'],
  '@ejsontype': ['name', 'comment']
};


var annotator = function(filename, where) {
  var self = this;
  var common = {};
  var ast = {};
  var p = {};

  self.reset = function() {
    ast = {};
    p = {};
  };

  self.add = function(name, obj) {
    if (name == '@param') {
      if (!ast[name]) {
        ast[name] = [];
      }
      var param = {};
      param['type'] = obj['type'] || '{any}';
      param['comment'] = obj['comment'] || '';

      if (obj.name && obj.name[0] == '[' && obj.name[obj.name.length-1] == ']') {
        param['optional'] = true;
        var text = obj.name.substr(1, obj.name.length-2);
        text = text.replace(' =', '=').replace('= ', '=');
        text = text.split('=');
        param['name'] = text[0] || 'noname';
        if (text.length > 1) {
          param['default'] = text[1];
        }
      } else {
        param['name'] = obj.name;
      }

      var a = param['name'].indexOf('.');
      if (a > -1) {
        // Could be options.name ...
        // This should be added to options children
        var paramName = param['name'].substr(0, a);

        if (!p[paramName]) {
          var newObj = { name: paramName, type: '{object}'};
          ast[name].push(newObj);
          p[param[paramName]] = newObj;
        }

        param['name'] = param['name'].substr(a+1);

        if (p[paramName]) {
          if (!p[paramName].children) p[paramName].children = [];
          p[paramName].children.push(param);
        }


      } else {
        ast[name].push(param);
        p[param['name']] = param;
      }
    } else {
      if (types[name]) {
        if (types[name].length == 1) {
          // Set the attribute or true
          ast[name] = obj[types[name][0]] || true;
        } else {
          // Set the object
          ast[name] = obj || {};
          if (name == '@this' || name == '@self') {
            common[name] = ast[name].name;
          }
        }
        
      }
    }
  };

  self.addName = function(name) {
    var methodName = '';
    if (name) {
      // TODO: var foo; is private...
      if (name.substr(0, 4) == 'var ') {
        ast['@private'] = true;
        methodName = name.substr(4);
      }
      // self.foo -> bar.foo
      if (common['@self'] && name.substr(0, 5) == 'self.') {
        methodName = common['@self'].toLowerCase() + name.substr(4);
      }
      // self.foo -> bar.foo
      if (common['@this'] && name.substr(0, 5) == 'this.') {
        
        methodName = common['@this'].toLowerCase() + name.substr(4);
      }
      
      // Set the type
      if (!ast['@type']) {
        if (ast['@param'] || ast['@method'] || ast['@return'] || ast['@returns'] || ast['@constructor']) {
          ast['@type'] = { name: '{function}' };
        } else {
          ast['@type'] = { name: '{any}' };
        }
      }

      // Set method or property with name..
      if (!ast['@method'] && !ast['@property'] && !ast['@callback']) {
        if (ast['@type'].name == '{function}') {
          ast['@method'] = { name: methodName || name };
        } else {
          ast['@property'] = { name: methodName || name };
        }
      }

      // Set where
      if (!ast['@where']) {
        ast['@where'] = { where: '{'+ where.join('|')+'}'};
      }

      var whereString = ast['@where'].where.toLowerCase();
      var whereClient = whereString.indexOf('client') > -1;
      var whereServer = whereString.indexOf('server') > -1;
      if (!whereClient && whereServer) ast['@where'] = 'Server';
      if (whereClient && !whereServer) ast['@where'] = 'Client';
      if (whereClient && whereServer) ast['@where'] = 'Anywhere';

      // Set the namespace
      if (!ast['@namespace'] || ast['@constructor']) {
        ast['@namespace'] = { name: (ast['@property'] || ast['@callback'] || ast['@method'] || '').name.split('.')[0] };
      }

      ast['@methodName'] = name;

    }
  };

  self.addReference = function(line, text) {
    if (typeof line !== 'undefined' && text && text.length) {
      var list = text.split('{');
      ast['@reference'] = {
        line: line,
        text: list[0] + ((list.length > 1)?'{ ...':'')
      };
    }
  };

  self.getAST = function() { 
    return ast;
  };
};

module.exports = {
  types: types,
  annotator: annotator
};