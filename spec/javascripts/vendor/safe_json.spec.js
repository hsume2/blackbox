if(!blackbox) { var blackbox = require('../../../index'); };
if(!sinon) { var sinon = require('sinon'); };
if(!chai) { var chai = require('chai'); };
if(!window) { var window = require('window'); };

var expect = chai.expect;
var SafeJSON = blackbox.SafeJSON;

describe('SafeJSON', function(){

  describe('.stringify', function(){

    after(function() {
      Array.prototype.toJSON = null;
    });

    it('should properly stringify array', function() {
      expect(SafeJSON.stringify([1, 2, 3])).to.equal('[1,2,3]');
    });

    describe('with bad stringify', function() {

      it('should throw error', function() {
        var toJSON = function() {};
        Array.prototype.toJSON = toJSON;

        var stub = sinon.stub(SafeJSON, '_stringify');
        stub.throws('TypeError', 'unexpected token v');

        var fn = function() { SafeJSON.stringify([1, 2, 3]); };
        expect(fn).to.throw();

        expect(Array.prototype.toJSON).to.equal(toJSON);
      });

    });

    it('should swap out Array.prototype.toJSON', function() {
      var toJSON = function() {};
      Array.prototype.toJSON = toJSON;

      SafeJSON.stringify([1, 2, 3]);

      expect(Array.prototype.toJSON).to.equal(toJSON);
    });

  });

});
