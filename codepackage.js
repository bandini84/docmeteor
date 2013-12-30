var exportObject = {}, Package = {describe: function(obj) {exportObject.describe = obj;},on_use: function(fn) {exportObject.on_use = fn;},on_test: function(fn) {exportObject.on_test = fn;}};
Package.describe({
  summary: "PowerQueue is a powerful tool for handling async tasks, throtling etc."
});

Package.on_use(function (api) {

  api.use('deps', ['client', 'server']);

  api.export && api.export('PowerQueue');
  api.add_files(['reactive-property.js', 'micro-queue.js', 'power-queue.js'], ['client', 'server']);
});

Package.on_test(function (api) {
  api.use('power-queue');
  api.use('test-helpers', 'server');
  api.use('tinytest');

  api.add_files('tests.js');
});

module.exports = exportObject;