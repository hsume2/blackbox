var Message = (function() {

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
