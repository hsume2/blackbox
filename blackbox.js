(function(){function require(p, context, parent){ context || (context = 0); var path = require.resolve(p, context), mod = require.modules[context][path]; if (!mod) throw new Error('failed to require "' + p + '" from ' + parent); if(mod.context) { context = mod.context; path = mod.main; mod = require.modules[context][mod.main]; } if (!mod.exports) { mod.exports = {}; mod.call(mod.exports, mod, mod.exports, require.relative(path, context)); } return mod.exports;}require.modules = [{}];require.resolve = function(path, context){ var orig = path, reg = path + '.js', index = path + '/index.js'; return require.modules[context][reg] && reg || require.modules[context][index] && index || orig;};require.relative = function(relativeTo, context) { return function(p){ if ('.' != p.charAt(0)) return require(p); var path = relativeTo.split('/') , segs = p.split('/'); path.pop(); for (var i = 0; i < segs.length; i++) { var seg = segs[i]; if ('..' == seg) path.pop(); else if ('.' != seg) path.push(seg); } return require(path.join('/'), context, relativeTo); };};
require.modules[0]["jquery"] = { exports: window.jQuery };
require.modules[0]["window"] = { exports: window };
require.modules[0]['blackbox.js'] = function(module, exports, require){var Storage = require('./blackbox/storage');
var Queue = require('./blackbox/queue');
var Message = require('./blackbox/message');
var JqueryBackend = require('./blackbox/jquery_backend');

var Blackbox = (function() {

  function Blackbox(options) {
    this.options = options || {};
    this.timeout = this.options.timeout || 5000;
    this.queue = new Queue();
  }

  Blackbox.prototype.write = function(str) {
    this.queue.push(String(str));
    this.trigger();
  };

  Blackbox.prototype.writeMeta = function(name, level, args) {
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
        if(message === Object(message)) {
          messages.push(Message.fromObject(message));
        } else {
          messages.push(message);
        }
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
};
require.modules[0]['blackbox/jquery_backend.js'] = function(module, exports, require){var JqueryBackend = (function() {

  function JqueryBackend(options) {
    this.options = options || {};
    this.url = this.options.url || '/blackbox';
    this.jQuery = this.options.jQuery || require('jquery');
  }

  JqueryBackend.prototype.post = function(messages) {
    if(!this.jQuery) { throw('jQuery is required!'); };

    return this.jQuery.ajax({
      url: this.url,
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({ payload: messages }),
      dataType: 'json'
    });
  };

  return JqueryBackend;

}());

module.exports = JqueryBackend;
};
require.modules[0]['blackbox/message.js'] = function(module, exports, require){var Message = (function() {

  function Message(name, level, args) {
    this.name = name;
    this.level = level;
    this.args = args;
  }

  Message.fromObject = function(object) {
    return new Message(object.name, object.level, object.args);
  };

  return Message;

}());

module.exports = Message;
};
require.modules[0]['blackbox/queue.js'] = function(module, exports, require){var Storage = require('./storage');

var Queue = (function() {

  function Queue() {
    this.messages = [];
    this.length = 0;
    this.id = uuid();
  }

  Queue.prototype.push = function(message) {
    this.messages.push(message);
    this.length = this.messages.length;
    this.storage = new Storage('blackbox');
    this.storage.set(this.id, this.messages);
  };

  Queue.prototype.clear = function() {
    this.storage.del(this.id);
  };

  Queue.prototype.export = function() {
    return this.messages;
  };

  return Queue;

}());

var uuid = function() {
  return [(new Date()).valueOf(), Math.random()*0x100000000].join(':');
};

Queue._uuid = function(backend) {
  if(backend) {
    uuid = backend;
  } else {
    return uuid;
  }
};

module.exports = Queue;
};
require.modules[0]['blackbox/storage.js'] = function(module, exports, require){var win = require('window');

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

module.exports = Storage;
};
require.modules[0]['storage.js'] = function(module, exports, require){var win = require('window');

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

module.exports = Storage;
};
blackbox = require('blackbox.js');
}());