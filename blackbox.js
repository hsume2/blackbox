(function(){function require(p, context, parent){ context || (context = 0); var path = require.resolve(p, context), mod = require.modules[context][path]; if (!mod) throw new Error('failed to require "' + p + '" from ' + parent); if(mod.context) { context = mod.context; path = mod.main; mod = require.modules[context][mod.main]; } if (!mod.exports) { mod.exports = {}; mod.call(mod.exports, mod, mod.exports, require.relative(path, context)); } return mod.exports;}require.modules = [{}];require.resolve = function(path, context){ var orig = path, reg = path + '.js', index = path + '/index.js'; return require.modules[context][reg] && reg || require.modules[context][index] && index || orig;};require.relative = function(relativeTo, context) { return function(p){ if ('.' != p.charAt(0)) return require(p); var path = relativeTo.split('/') , segs = p.split('/'); path.pop(); for (var i = 0; i < segs.length; i++) { var seg = segs[i]; if ('..' == seg) path.pop(); else if ('.' != seg) path.push(seg); } return require(path.join('/'), context, relativeTo); };};
require.modules[0]["jquery"] = { exports: window.jQuery };
require.modules[0]["window"] = { exports: window };
require.modules[0]['blackbox.js'] = function(module, exports, require){var uuid = require('./vendor/uuid');
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
};
require.modules[0]['vendor/uuid.js'] = function(module, exports, require){var uuid = (function() {
  /*
  * Generate a RFC4122(v4) UUID
  *
  * Documentation at https://github.com/broofa/node-uuid
  */

  // Use node.js Buffer class if available, otherwise use the Array class
  var BufferClass = typeof(Buffer) == 'function' ? Buffer : Array;

  // Buffer used for generating string uuids
  var _buf = new BufferClass(16);

  // Cache number <-> hex string for octet values
  var toString = [];
  var toNumber = {};
  for (var i = 0; i < 256; i++) {
    toString[i] = (i + 0x100).toString(16).substr(1);
    toNumber[toString[i]] = i;
  }

  function unparse(buf) {
    var tos = toString, b = buf;
    return tos[b[0]] + tos[b[1]] + tos[b[2]] + tos[b[3]] + '-' +
           tos[b[4]] + tos[b[5]] + '-' +
           tos[b[6]] + tos[b[7]] + '-' +
           tos[b[8]] + tos[b[9]] + '-' +
           tos[b[10]] + tos[b[11]] + tos[b[12]] +
           tos[b[13]] + tos[b[14]] + tos[b[15]];
  }

  var ff = 0xff;

  var rnds = new Array(4);

  function uuid(fmt, buf, offset) {
    var b = fmt != 'binary' ? _buf : (buf ? buf : new BufferClass(16));
    var i = buf && offset || 0;

    rnds[0] = Math.random()*0x100000000;
    rnds[1] = Math.random()*0x100000000;
    rnds[2] = Math.random()*0x100000000;
    rnds[3] = Math.random()*0x100000000;

    var r = rnds[0];
    b[i++] = r & ff;
    b[i++] = r>>>8 & ff;
    b[i++] = r>>>16 & ff;
    b[i++] = r>>>24 & ff;
    r = rnds[1];
    b[i++] = r & ff;
    b[i++] = r>>>8 & ff;
    b[i++] = r>>>16 & 0x0f | 0x40; // See RFC4122 sect. 4.1.3
    b[i++] = r>>>24 & ff;
    r = rnds[2];
    b[i++] = r & 0x3f | 0x80; // See RFC4122 sect. 4.4
    b[i++] = r>>>8 & ff;
    b[i++] = r>>>16 & ff;
    b[i++] = r>>>24 & ff;
    r = rnds[3];
    b[i++] = r & ff;
    b[i++] = r>>>8 & ff;
    b[i++] = r>>>16 & ff;
    b[i++] = r>>>24 & ff;

    return fmt === undefined ? unparse(b) : b;
  }

  uuid.unparse = unparse;
  uuid.BufferClass = BufferClass;

  return uuid;
}());

module.exports = uuid;
};
blackbox = require('blackbox.js');
}());