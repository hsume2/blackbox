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

  Blackbox.prototype.format = function(name, level, args) {
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

exports = module.exports = Blackbox;

if(typeof(process) !== 'undefined' && process && process.env && (process.env.BLACKBOX_DEV || process.env.BLACKBOX_COV)) {
  exports.Storage = Storage;
  exports.Queue = Queue
  exports.Message = Message;
  exports.JqueryBackend = JqueryBackend;
  exports.SafeJSON = require('./blackbox/safe_json');
}

exports.Minilog = require('./vendor/minilog');
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

  Queue.prototype.export = function() {
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
require.modules[0]['vendor/minilog.js'] = function(module, exports, require){var window = require('window');

(function(){function require(p, context, parent){ context || (context = 0); var path = require.resolve(p, context), mod = require.modules[context][path]; if (!mod) throw new Error('failed to require "' + p + '" from ' + parent); if(mod.context) { context = mod.context; path = mod.main; mod = require.modules[context][mod.main]; } if (!mod.exports) { mod.exports = {}; mod.call(mod.exports, mod, mod.exports, require.relative(path, context)); } return mod.exports;}require.modules = [{}];require.resolve = function(path, context){ var orig = path, reg = path + '.js', index = path + '/index.js'; return require.modules[context][reg] && reg || require.modules[context][index] && index || orig;};require.relative = function(relativeTo, context) { return function(p){ if ('.' != p.charAt(0)) return require(p); var path = relativeTo.split('/') , segs = p.split('/'); path.pop(); for (var i = 0; i < segs.length; i++) { var seg = segs[i]; if ('..' == seg) path.pop(); else if ('.' != seg) path.push(seg); } return require(path.join('/'), context, relativeTo); };};
require.modules[0]["jquery"] = { exports: window.$ };
require.modules[0]['index.js'] = function(module, exports, require){var Minilog = require('./minilog.js');

// default formatter for browser
Minilog.format(function(name, level, args) {
  var prefix = [];
  if(name) prefix.push(name);
  if(level) prefix.push(level);
 return prefix.concat(args).join(' ');
});

// support for enabling() console logging easily
var enabled = false, whitelist = [], levelMap = { debug: 1, info: 2, warn: 3, error: 4 };

function filter(name, level) {
  var i, expr;
  for(i = 0; i < whitelist.length; i++) {
    expr = whitelist[i];
    if (expr.topic && expr.topic.test(name) && (expr.level == levelMap.debug || levelMap[level] >= expr.level)) {
      return true;
    }
  }
  return false;
}

Minilog.enable = function(str) {
  if(!enabled) { Minilog.pipe(require('./lib/browser/console.js')).filter(filter); }
  enabled = true;
  whitelist = [];
  if(!str) { str = '*.debug'; }
  var parts = str.split(/[\s,]+/), i, expr;
  for(i = 0; i < parts.length; i++) {
    expr = parts[i].split('.');
    if(expr.length > 2) { expr = [ expr.slice(0, -1).join('.'), expr.slice(-1).join() ]; }
    whitelist.push({ topic: new RegExp('^'+expr[0].replace('*', '.*')), level: levelMap[expr[1]] || 1 });
  }
  if(typeof window != 'undefined' && window.localStorage) {
    window.localStorage.minilogSettings = JSON.stringify(str);
  }
};

// apply enable inputs from localStorage and from the URL
if(typeof window != 'undefined') {
  if(window.localStorage && window.localStorage.minilogSettings) {
    try {
      Minilog.enable(JSON.parse(window.localStorage.minilogSettings));
    } catch(e) { }
  }
  if(window.location && window.location.search) {
    var match = RegExp('[?&]minilog=([^&]*)').exec(window.location.search);
    match && Minilog.enable(decodeURIComponent(match[1]));
  }
}

exports = module.exports = Minilog;
exports.backends = {   browser: require('./lib/browser/console.js') };
};
require.modules[0]['lib/browser/console.js'] = function(module, exports, require){module.exports = {
  write: function(str) {
    if (typeof console === 'undefined' || !console.log) return;
    if (console.log.apply) {
      // console.log.apply is undefined in IE8 and IE9
      // and still useless for objects in IE9. But useful for non-IE browsers.
      return console.log.apply(console, arguments);
    }
    if(!JSON || !JSON.stringify) return;
    // for IE8/9: make console.log at least a bit less awful
    var args = Array.prototype.slice.call(arguments),
        len = args.length;
    for(var i = 0; i < len; i++) {
      args[i] = JSON.stringify(args[i]);
    }
    console.log(args.join(' '));
  },
  end: function() {}
};
};
require.modules[0]['minilog.js'] = function(module, exports, require){var callbacks = [],
    log = { readable: true },
    def = { format: function() { return ''; } };

log.on = log.addListener = function(ev, callback) {
  callbacks[ev] || (callbacks[ev] = []);
  callbacks[ev].unshift( callback );
  return log;
};

log.emit = function(ev) {
  if(!callbacks[ev]) return;
  var args = Array.prototype.slice.call(arguments, 1);
  for(var i = callbacks[ev].length-1; i >= 0; i--){
    callbacks[ev][i] && callbacks[ev][i].apply(log, args);
  }
};

log.removeListener = log.removeAllListeners = function(ev, callback) {
  if(!callbacks[ev]) return;
  if(!callback) { delete callbacks[ev]; return; }
  for(var i = callbacks[ev].length-1; i >= 0; i--) {
    if(callbacks[ev][i] == callback) {
      callbacks[ev].splice(i, 1);
    }
  }
};

log.serialize = function(items) {
  if(!JSON || !JSON.stringify) return items;
  for(var i = 0; i < items.length; i++) {
    if(items[i] && typeof items[i] == 'object') {
      // Buffers in Node.js look bad when stringified
      if(items[i].constructor && items[i].constructor.isBuffer) {
        items[i] = items[i].toString();
      } else {
        items[i] = JSON.stringify(items[i]);
      }
    }
  }
  return items;
}

exports = module.exports = function create(name) {
  var o   = function() { log.emit('item', name, undefined, Array.prototype.slice.call(arguments)); return o; };
  o.debug = function() { log.emit('item', name, 'debug', Array.prototype.slice.call(arguments)); return o; };
  o.info  = function() { log.emit('item', name, 'info',  Array.prototype.slice.call(arguments)); return o; };
  o.warn  = function() { log.emit('item', name, 'warn',  Array.prototype.slice.call(arguments)); return o; };
  o.error = function() { log.emit('item', name, 'error', Array.prototype.slice.call(arguments)); return o; };
  return o;
};

exports.format = function(formatter) {
  def.format = formatter;
};

exports.pipe = function(dest) {
  var config = {};
  if(dest._isFormatted) {
    log.on('item', function(name, level, args) {
      if(config.filter && !config.filter(name, level)) return;
      dest.format(name, level, args);
    });
  } else {
    log.on('item', function(name, level, args) {
      if(config.filter && !config.filter(name, level)) return;
      dest.write((config.format ? config : def).format(name, level, log.serialize(args)));
    });
  }
  log.on('end', function() { !dest._isStdio && dest.end(); });
  var chain = {
    filter: function(cb) { config.filter = cb; return chain; },
    format: function(cb) { config.format = cb; return chain; },
    pipe: exports.pipe
  };
  return chain;
};

exports.end = function() {
  log.emit('end');
  callbacks = [];
};
};
Minilog = require('index.js');
}());

module.exports = Minilog;
};
blackbox = require('blackbox.js');
}());