if(!blackbox) { var blackbox = require('../../index'); };
if(!sinon) { var sinon = require('sinon'); };
if(!chai) { var chai = require('chai'); };
if(!window) { var window = require('window'); };

var assert = chai.assert;

describe('Blackbox', function(){

  beforeEach(function(){
    this.sandbox = sinon.sandbox.create();
    this.sandbox.useFakeServer();
    this.sandbox.useFakeTimers();
    this.clock = this.sandbox.clock;
    window.localStorage.clear();
  });

  afterEach(function() {
    this.sandbox.restore();
  });

  describe('#timeout', function(){

    it('should have timeout', function() {
      var sut = new blackbox();
      assert.equal(sut.timeout, 5000);
    });

    it('should have custom timeout', function() {
      var sut = new blackbox({ timeout: 2400 });
      assert.equal(sut.timeout, 2400);
    });

  });

  describe('#write()', function(){

    before(function() {
      this.uuid = blackbox._uuid();
      blackbox._uuid(function() { return 'this-is-a-uniqe-id'; });
    });

    after(function() {
      blackbox._uuid(this.uuid);
    });

    it('should push to queue', function() {
      var sut = new blackbox();
      sut.write('this is a message');
      assert.include(sut.queue(), 'this is a message');
    });

    it('should persist queue in localStorage', function() {
      var sut = new blackbox();
      sut.write('event-1');
      sut.write('event-2');

      assert.equal(window.localStorage.getItem('blackbox'), JSON.stringify({
        'this-is-a-uniqe-id': ["event-1","event-2"]
      }));
    });

  });

  describe('#clearQueue()', function() {

    before(function() {
      this.uuid = blackbox._uuid();
      blackbox._uuid(function() { return 'this-is-a-uniqe-id'; });
    });

    after(function() {
      blackbox._uuid(this.uuid);
    });

    it('should clear queued events', function() {
      var sut = new blackbox();
      sut.write('something');
      sut.write('something');
      assert.length(sut.queue(), 2);
      sut.clearQueue();
      assert.length(sut.queue(), 0);
    });

    it('should remove persisted queue from localStorage', function() {
      var sut = new blackbox();
      sut.write('event-1');
      sut.write('event-2');

      assert.equal(window.localStorage.getItem('blackbox'), JSON.stringify({
        'this-is-a-uniqe-id': ["event-1","event-2"]
      }));

      blackbox._uuid(function() { return 'this-is-another-uniqe-id'; });

      sut.clearQueue();
      sut.write('event-3');

      assert.equal(window.localStorage.getItem('blackbox'), JSON.stringify({
        'this-is-another-uniqe-id': ["event-3"]
      }));
    });

  });

  describe('#flush()', function(){

    it('should flush logs after timeout', function() {
      var sut = new blackbox();
      var spy = sinon.spy(sut, '_internalFlush');
      sinon.stub(sut, 'send');

      sinon.assert.notCalled(spy);

      sut.write('something');

      sinon.assert.notCalled(spy);
      this.clock.tick(sut.timeout / 2);
      sinon.assert.notCalled(spy);

      this.clock.tick(sut.timeout / 2);

      sinon.assert.calledOnce(spy);
    });

  });

  describe('#_internalFlush()', function(){

    it('should #send', function() {
      var sut = new blackbox();
      var stub = sinon.stub(sut, 'send');

      sinon.assert.notCalled(stub);

      sut.write('something');

      sinon.assert.notCalled(stub);

      sut._internalFlush();

      sinon.assert.calledWith(stub);
    });

    it('should do nothing and wait for next flush if queue is empty', function() {
      var sut = new blackbox();
      var send = sinon.spy(sut, 'send');
      var flush = sinon.spy(sut, 'flush');

      sinon.assert.notCalled(send);
      sinon.assert.notCalled(flush);

      sut._internalFlush();

      sinon.assert.notCalled(send);
      sinon.assert.calledOnce(flush);
    });

  });

  describe('#send()', function(){

    before(function() {
      this.uuid = blackbox._uuid();
      blackbox._uuid(function() { return 'this-is-a-uniqe-id'; });
    });

    after(function() {
      blackbox._uuid(this.uuid);
    });

    it('should POST to API end-point', function() {
      var fakeQuery = { ajax: function() {} };
      var ajaxPromise = { done: function() { return ajaxPromise; }, always: function() { return ajaxPromise; } };
      var doneSpy = sinon.spy(ajaxPromise, 'done');
      var alwaysSpy = sinon.spy(ajaxPromise, 'always');

      var expectation = sinon.mock(fakeQuery).expects('ajax').withArgs({
        contentType: "application/json",
        data: JSON.stringify({
          payload: {
            messages: ['event-1', 'event-2'],
            id: 'this-is-a-uniqe-id'
          }
        }),
        dataType: "json",
        type: "POST",
        url: "/blackbox"
      }).once().returns(ajaxPromise);
      var sut = new blackbox({ jQuery: fakeQuery });
      var flushSpy = sinon.spy(sut, 'flush');

      sut.write('event-1');
      sut.write('event-2');

      sut.send();

      // Asserts successful flush clears queue
      assert.length(sut.queue(), 2);
      doneSpy.callArg(0);
      assert.length(sut.queue(), 0);

      // Asserts enqueue next flush
      sinon.assert.calledOnce(flushSpy);
      alwaysSpy.callArg(0);
      sinon.assert.calledTwice(flushSpy);

      expectation.verify();
    });

  });

  describe('#sendFromStorage()', function(){

    before(function() {
      this.uuid = blackbox._uuid();
      blackbox._uuid(function() { return 'this-is-a-uniqe-id'; });
    });

    after(function() {
      blackbox._uuid(this.uuid);
    });

    it('should POST stored logs to API end-point', function() {
      var fakeQuery = { ajax: function() {} };
      var ajaxPromise = { done: function() { return ajaxPromise; }, always: function() { return ajaxPromise; } };
      var doneSpy = sinon.spy(ajaxPromise, 'done');
      var alwaysSpy = sinon.spy(ajaxPromise, 'always');

      var expectation = sinon.mock(fakeQuery).expects('ajax').withArgs({
        contentType: "application/json",
        data: JSON.stringify({
          payload: [
            {
              id: 'this-is-a-uniqe-id',
              messages: ['event-1']
            },
            {
              id: 'this-is-another-uniqe-id',
              messages: ['event-2']
            }
          ]
        }),
        dataType: "json",
        type: "POST",
        url: "/blackbox"
      }).once().returns(ajaxPromise);
      var sut = new blackbox({ jQuery: fakeQuery });
      var flushSpy = sinon.spy(sut, 'flush');

      window.localStorage.setItem('blackbox', JSON.stringify({
        'this-is-a-uniqe-id': ['event-1'],
        'this-is-another-uniqe-id': ['event-2']
      }));

      sut.sendFromStorage();

      doneSpy.callArg(0);
      assert.equal(window.localStorage.getItem('blackbox'), '{}');

      expectation.verify();
    });

    it('should do nothing if no stored logs', function() {
      var fakeQuery = { ajax: function() {} };
      var ajaxPromise = { done: function() { return ajaxPromise; }, always: function() { return ajaxPromise; } };
      var doneSpy = sinon.spy(ajaxPromise, 'done');
      var alwaysSpy = sinon.spy(ajaxPromise, 'always');

      var expectation = sinon.mock(fakeQuery).expects('ajax').never();
      var sut = new blackbox({ jQuery: fakeQuery });
      var flushSpy = sinon.spy(sut, 'flush');

      sut.sendFromStorage();

      expectation.verify();
    });

    it('should send stored logs upon initializing a blackbox', function() {
      var fakeQuery = { ajax: function() {} };
      var ajaxPromise = { done: function() { return ajaxPromise; }, always: function() { return ajaxPromise; } };
      var doneSpy = sinon.spy(ajaxPromise, 'done');
      var alwaysSpy = sinon.spy(ajaxPromise, 'always');

      var expectation = sinon.mock(fakeQuery).expects('ajax').withArgs({
        contentType: "application/json",
        data: JSON.stringify({
          payload: [
            {
              id: 'this-is-a-uniqe-id',
              messages: ['event-1']
            },
            {
              id: 'this-is-another-uniqe-id',
              messages: ['event-2']
            }
          ]
        }),
        dataType: "json",
        type: "POST",
        url: "/blackbox"
      }).once().returns(ajaxPromise);

      window.localStorage.setItem('blackbox', JSON.stringify({
        'this-is-a-uniqe-id': ['event-1'],
        'this-is-another-uniqe-id': ['event-2']
      }));

      var sut = new blackbox({ jQuery: fakeQuery });
      var flushSpy = sinon.spy(sut, 'flush');

      doneSpy.callArg(0);
      assert.equal(window.localStorage.getItem('blackbox'), '{}');

      expectation.verify();
    });

  });

  if(window && window.jQuery) {

    describe('Live Browser', function() {

      before(function() {
        this.uuid = blackbox._uuid();
        blackbox._uuid(function() { return 'this-is-a-uniqe-id'; });
      });

      after(function() {
        blackbox._uuid(this.uuid);
      });

      describe('#send()', function(){

        it('should POST to API end-point', function() {
          var sut = new blackbox({ url: '/log/blackbox' });

          sut.write('event-1');
          sut.write('event-2');

          this.clock.tick(sut.timeout);

          assert.length(this.sandbox.server.requests, 1);

          var request = this.sandbox.server.requests[0];

          assert.equal(request.url, '/log/blackbox');
          assert.equal(request.method, 'POST');
          assert.equal(request.async, true);

          assert.equal(request.requestHeaders['Content-Type'], 'application/json;charset=utf-8');
          assert.equal(request.requestHeaders['Accept'], 'application/json, text/javascript, */*; q=0.01');
          assert.equal(request.requestHeaders['X-Requested-With'], 'XMLHttpRequest');

          assert.equal(request.requestBody, JSON.stringify({
            payload: {
              messages: ['event-1', 'event-2'],
              id: 'this-is-a-uniqe-id'
            }
          }));

          this.sandbox.server.respondWith([200, {}, '']);
          this.sandbox.server.respond();

          assert.length(sut.queue(), 0, 'Should have 0 after server responds with 200');
        });

        it('should retain logs upon API failure', function() {
          var sut = new blackbox();

          sut.write('event-1');
          sut.write('event-2');

          assert.length(sut.queue(), 2);

          this.clock.tick(sut.timeout);

          assert.length(sut.queue(), 2, 'Should have 2 while waiting for server to respond');

          this.sandbox.server.respondWith([500, {}, '']);
          this.sandbox.server.respond();

          assert.length(sut.queue(), 2, 'Should have 2 after server responds with 500');
        });

      });

    });

  }

});
