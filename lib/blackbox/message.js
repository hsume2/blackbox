var Message = (function() {

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
