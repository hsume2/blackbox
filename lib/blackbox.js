var Storage = require('./blackbox/storage');
var Queue = require('./blackbox/queue');
var Message = require('./blackbox/message');
var JqueryBackend = require('./blackbox/jquery_backend');

var Blackbox = (function() {

  function Blackbox(options) {
    this.options = options || {};
    this.timeout = this.options.timeout*1000 || 5000;
    this.queue = new Queue();
    this._isFormatted = this.options.isFormatted || false;
  }

  Blackbox.prototype.write = function(str) {
    this.queue.push(String(str));
    this.trigger();
  };

  Blackbox.prototype.format = function() {
    var args = Array.prototype.slice.call(arguments);
    if(this._setFormat.apply(this, args)) {
      return this;
    }

    this._writeFormat.apply(this, args);
  };

  Blackbox.prototype._setFormat = function() {
    var args = Array.prototype.slice.call(arguments);
    if(args.length == 1 && Object.prototype.toString.call(args[0]) == '[object Function]') {
      this.options.format = args[0];
      return true;
    }

    return false;
  };

  Blackbox.prototype._writeFormat = function(name, level, args) {
    if(Object.prototype.toString.call(this.options.format) == '[object Function]') {
      var result = this.options.format(name, level, args);
      name = result[0], level = result[1], args = result[2];
    }
    this.queue.push(new Message(name, level, args));
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
    this._post(this.queue.dump()).done(function() {
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

  Blackbox.extend = require('./vendor/extend');

  return Blackbox;

}());

exports = module.exports = Blackbox;

if(typeof(process) !== 'undefined' && process && process.env && (process.env.BLACKBOX_DEV || process.env.BLACKBOX_COV)) {
  exports.Storage = Storage;
  exports.Queue = Queue;
  exports.Message = Message;
  exports.JqueryBackend = JqueryBackend;
  exports.SafeJSON = require('./blackbox/safe_json');
}
