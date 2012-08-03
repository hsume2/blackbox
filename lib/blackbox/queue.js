var Storage = require('./storage');

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

if(process && process.env && (process.env.BLACKBOX_DEV || process.env.BLACKBOX_COV)) {
  Queue._uuid = function(backend) {
    if(backend) {
      uuid = backend;
    } else {
      return uuid;
    }
  };
}

module.exports = Queue;
