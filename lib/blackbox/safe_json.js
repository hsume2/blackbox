var SafeJSON = {
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
