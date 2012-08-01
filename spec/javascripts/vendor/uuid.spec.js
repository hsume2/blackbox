if(!blackbox) { var blackbox = require('../../../index'); };
if(!sinon) { var sinon = require('sinon'); };
if(!chai) { var chai = require('chai'); };

var assert = chai.assert;

describe('uuid', function(){

  before(function() {
    this.uuid = blackbox._uuid();
  });

  describe('generation', function(){

    it('should return RFC4122 compatible string', function() {
      assert.length(this.uuid(), 36);
    });

  });

});
