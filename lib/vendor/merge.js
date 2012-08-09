var merge = function(target) {
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
