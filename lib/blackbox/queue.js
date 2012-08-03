var Storage = require('./storage');

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
