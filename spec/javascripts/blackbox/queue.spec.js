if(!blackbox) { var blackbox = require('../../../index'); };
if(!sinon) { var sinon = require('sinon'); };
if(!chai) { var chai = require('chai'); };

var expect = chai.expect;
var Queue = blackbox.Queue;

describe('Queue', function(){

  describe('.uuid', function(){

    before(function() {
      this.uuid = Queue._uuid();
    });

    it('should return relatively unique string', function() {
      var date = (new Date()).valueOf();
      var dateLength = date.toString().length;
      expect(this.uuid()).to.match(new RegExp("[0-9]{" + dateLength + "}:[0-9]+"));
    });

  });

  describe('#size', function() {

    it('should set max buffer size', function() {
      var queue = new Queue({ size: 10 });
      expect(queue.size).to.equal(10);
    });

    it('should have max buffer size of 1000 by default', function() {
      var queue = new Queue();
      expect(queue.size).to.equal(1000);
    });

  });

  describe('#push', function() {

    it('should push until buffer is full', function() {
      var queue = new Queue({ size: 10 });

      for (var i = 0; i < 15; i++) {
        queue.push('event-' + i);
      }

      expect(queue).to.have.length(10);

      expect(queue.messages).to.deep.equal([
        'event-11',
        'event-12',
        'event-13',
        'event-14',
        'event-4',
        'event-5',
        'event-6',
        'event-7',
        'event-8',
        'event-9'
      ])
    });

  });

});
