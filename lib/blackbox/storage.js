var win = require('window');
var SafeJSON = require('./safe_json');

var Storage = (function() {

  function Storage(name) { this.name = name; }

  Storage.prototype.set = function(key, value) {
    var stored = win.localStorage.getItem(this.name);
    if(stored) {
      stored = JSON.parse(stored);
    } else {
      stored = {};
    }
    stored[key] = value;
    win.localStorage.setItem(this.name, SafeJSON.stringify(stored));
  };

  Storage.prototype.del = function(key) {
    var stored = win.localStorage.getItem(this.name);
    if(stored) {
      stored = JSON.parse(stored);
      delete stored[key];
      win.localStorage.setItem(this.name, SafeJSON.stringify(stored));
    }
  };

  Storage.prototype.all = function() {
    var stored = win.localStorage.getItem(this.name);
    if(stored) {
      stored = JSON.parse(stored);
      return stored;
    } else {
      return {};
    }
  };

  return Storage;

}());

module.exports = Storage;
