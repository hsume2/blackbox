var Storage = require('./blackbox/storage');
var Queue = require('./blackbox/queue');
var JqueryBackend = require('./blackbox/jquery_backend');

var Blackbox = (function() {

  function Blackbox(options) {
    this.options = options || {};
    this.timeout = this.options.timeout || 5000;
    this.queue = new Queue();
  }

  Blackbox.prototype.write = function(str) {
    this.queue.push(str);
    this.trigger();
  };

  Blackbox.prototype.writeMeta = function(name, level, args) {
    this.queue.push([name, level, args]);
    this.trigger();
  };

  Blackbox.prototype.clearQueue = function() {
    if(this.queue) {
      this.queue.clear();
      this.queue = new Queue();
    }
  };

  Blackbox.prototype.flush = function() {
    var self = this;
    setTimeout(function() {
      var q = self.queue;
      if(q.length > 0) {
        self.send();
      } else {
        self.flush();
      }
    }, this.timeout);
  };

  Blackbox.prototype.trigger = function() {
    if(this.isRunning) { return; }
    this.flush();
    this.isRunning = true;
  };

  Blackbox.prototype.send = function() {
    var self = this;
    this._post(this.queue.export()).done(function() {
      self.clearQueue();
    }).always(function() {
      self.flush();
    });
  };

  Blackbox.prototype.jquery = function(options) {
    this.backend = new JqueryBackend(options);
    this.sendFromStorage();
    return this;
  };

  Blackbox.prototype.sendFromStorage = function() {
    var storage = new Storage('blackbox');
    var all = storage.all();
    var messages = [];

    for(var key in all) {
      var value = all[key];
      for (var i = 0; i < value.length; i++) {
        var message = value[i];
        messages.push(message);
      }
    }

    if(messages.length < 1) return;

    this._post(messages).done(function() {
      for(var key in all) {
        storage.del(key);
      }
    });
  };

  Blackbox.prototype._post = function(messages) { return this.backend.post(messages); };

  return Blackbox;

}());

Blackbox._uuid = Queue._uuid;

module.exports = Blackbox;
