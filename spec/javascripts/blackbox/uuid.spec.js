if(!blackbox) { var blackbox = require('../../../index'); };
if(!sinon) { var sinon = require('sinon'); };
if(!chai) { var chai = require('chai'); };

var expect = chai.expect;

describe('uuid', function(){

  before(function() {
    this.uuid = blackbox._uuid();
  });

  describe('generation', function(){

    it('should return relatively unique string', function() {
      var date = (new Date()).valueOf();
      var dateLength = date.toString().length;
      expect(this.uuid()).to.match(new RegExp("[0-9]{" + dateLength + "}:[0-9]{9,10}"));
    });

  });

});
