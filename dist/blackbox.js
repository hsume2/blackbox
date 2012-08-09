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
      for(var i = 0; i < value.length; i++) {
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

  Blackbox.merge = require('./vendor/merge');

  Blackbox.formatWithMeta = function(defaultMetaCallback) {
    return function(name, level, args) {
      var _meta = defaultMetaCallback();

      if(!args) args = [];
      var meta = args[args.length - 1];
      if(meta && meta === Object(meta)) {
        args.pop();
        _meta = Blackbox.merge(meta, _meta);
      }
      args.push(_meta);

      return [name, level, args];
    };
  };

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
};
require.modules[0]['blackbox/jquery_backend.js'] = function(module, exports, require){var SafeJSON = require('./safe_json');

var JqueryBackend = (function() {

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
      data: SafeJSON.stringify({ logs: messages }),
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

  Message.prototype.toString = function() {
    return [this.name, this.level, this.args];
  };

  return Message;

}());

module.exports = Message;
};
require.modules[0]['blackbox/queue.js'] = function(module, exports, require){var Storage = require('./storage');

var Queue = (function() {

  function Queue(options) {
    this.options = options || {};
    this.size = this.options.size || 1000;
    this.messages = [];
    this.length = 0;
    this.index = 0;
    this.id = uuid();
  }

  Queue.prototype.push = function(message) {
    message = message.toString();
    if(this.index >= this.size) {
      this.index = 0;
      this.messages.splice(this.index, 1, message);
    } else {
      this.messages.splice(this.index, 1, message);
      this.index++;
    }
    this.length = this.messages.length;
    this.storage = new Storage('blackbox');
    this.storage.set(this.id, this.messages);
  };

  Queue.prototype.clear = function() {
    this.storage.del(this.id);
  };

  Queue.prototype.dump = function() {
    return this.messages;
  };

  return Queue;

}());

var uuid = function() {
  return [(new Date()).valueOf(), Math.random()*0x100000000].join(':');
};

if(typeof(process) !== 'undefined' && process && process.env && (process.env.BLACKBOX_DEV || process.env.BLACKBOX_COV)) {
  Queue._uuid = function(backend) {
    if(backend) {
      uuid = backend;
    } else {
      return uuid;
    }
  };
}

module.exports = Queue;
};
require.modules[0]['blackbox/safe_json.js'] = function(module, exports, require){var SafeJSON = {
  stringify: function() {
    var args = Array.prototype.slice.apply(arguments);
    var value = args[0];
    var oldtoJSON = Array.prototype.toJSON;
    Array.prototype.toJSON = null;
    try {
      var result = this._stringify(value);
    } catch(e) {
      Array.prototype.toJSON = oldtoJSON;
      throw(e);
    }
    Array.prototype.toJSON = oldtoJSON;
    return result;
  },

  _stringify: function(value) {
    return JSON.stringify(value);
  }
};

module.exports = SafeJSON;
};
require.modules[0]['blackbox/storage.js'] = function(module, exports, require){var win = require('window');
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
};
require.modules[0]['vendor/merge.js'] = function(module, exports, require){var merge = function(target) {
  var args = Array.prototype.slice.call(arguments);
  for (var i = 1; i < args.length; i++) {
    var source = args[i];
    if(source !== undefined ) {
      for(var key in source) {
        if(!source.hasOwnProperty(key)) continue;
        target[key] = source[key];
      }
    }
  }
  return target;
};

module.exports = merge;
};
blackbox = require('blackbox.js');
}());