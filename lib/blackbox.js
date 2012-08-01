var uuid = require('./vendor/uuid');
var win = require('window');
var storage = win.localStorage;

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
    win.localStorage.setItem(this.name, JSON.stringify(stored));
  };

  Storage.prototype.del = function(key) {
    var stored = win.localStorage.getItem(this.name);
    if(stored) {
      stored = JSON.parse(stored);
      delete stored[key];
      win.localStorage.setItem(this.name, JSON.stringify(stored));
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

var Queue = (function() {

  function Queue() {
    this.messages = [];
    this.length = 0;
    this.id = uuid();
  }

  Queue.prototype.push = function(str) {
    this.messages.push(str);
    this.length = this.messages.length;
    this.storage = new Storage('blackbox');
    this.storage.set(this.id, this.messages);
  };

  Queue.prototype.clear = function() {
    this.storage.del(this.id);
  };

  Queue.prototype.export = function() {
    return JSON.stringify({
      payload: {
        messages: this.messages,
        id: this.id
      }
    });
  };

  return Queue;

}());

var Blackbox = (function() {

  function Blackbox(options) {
    this.options = options || {};
    this.timeout = this.options.timeout || 5000;
    this.sendFromStorage();
  }

  Blackbox.prototype.write = function(str) {
    this.queue().push(str);
    this.trigger();
  };

  Blackbox.prototype.queue = function() {
    if(!this._queue) {
      this._queue = new Queue();
    }
    return this._queue;
  };

  Blackbox.prototype.clearQueue = function() {
    if(this._queue) {
      this._queue.clear();
      this._queue = new Queue();
    }
  };

  Blackbox.prototype.flush = function() {
    var self = this;
    setTimeout(function() {
      self._internalFlush();
    }, this.timeout);
  };

  Blackbox.prototype._internalFlush = function() {
    var q = this.queue();
    if(q.length > 0) {
      this.send();
    } else {
      this.flush();
    }
  };

  Blackbox.prototype.trigger = function() {
    if(this.isRunning) { return; }
    this.flush();
    this.isRunning = true;
  };

  Blackbox.prototype.send = function() {
    var self = this;
    this._post(this.queue().export()).done(function() {
      self.clearQueue();
    }).always(function() {
      self.flush();
    });
  };

  Blackbox.prototype._post = function(data) {
    var jQ = this._jQuery();
    if(!jQ) { throw('jQuery is required!'); };

    return jQ.ajax({
      url: this._url(),
      type: 'POST',
      contentType: 'application/json',
      data: data,
      dataType: 'json'
    });
  };

  Blackbox.prototype.sendFromStorage = function() {
    var storage = new Storage('blackbox');
    var all = storage.all();
    var data = [];

    for(var key in all) {
      var value = all[key];
      data.push({
        id: key,
        messages: value
      });
    }

    if(data.length < 1) return;

    this._post(JSON.stringify({ payload: data })).done(function() {
      for(var key in all) {
        storage.del(key);
      }
    });
  };

  Blackbox.prototype._jQuery = function() {
    return this.options.jQuery || require('jquery');
  };

  Blackbox.prototype._url = function() {
    return this.options.url || '/blackbox';
  };

  return Blackbox;

}());

Blackbox._uuid = function(backend) {
  if(backend) {
    uuid = backend;
  } else {
    return uuid;
  }
};

module.exports = Blackbox;
