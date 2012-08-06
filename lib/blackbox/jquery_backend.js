var SafeJSON = require('./safe_json');

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
