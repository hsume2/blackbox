if(!blackbox) { var blackbox = require('../../index'); };
if(!sinon) { var sinon = require('sinon'); };
if(!chai) { var chai = require('chai'); };
if(!window) { var window = require('window'); };

var assert = chai.assert;
var expect = chai.expect;

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
      var sut = new blackbox({ timeout: 2.4 });
      assert.equal(sut.timeout, 2400);
    });

  });

  describe('#write()', function(){

    before(function() {
      this.uuid = blackbox.Queue._uuid();
      blackbox.Queue._uuid(function() { return 'this-is-a-uniqe-id'; });
    });

    after(function() {
      blackbox.Queue._uuid(this.uuid);
    });

    it('should push to queue', function() {
      var sut = new blackbox();
      sut.write('this is a message');
      expect(sut.queue.messages).to.include('this is a message');
    });

    it('should persist queue in localStorage', function() {
      var sut = new blackbox();
      sut.write('event-1');
      sut.write('event-2');

      assert.equal(window.localStorage.getItem('blackbox'), JSON.stringify({
        'this-is-a-uniqe-id': ["event-1","event-2"]
      }));
    });

    it('should perform initial trigger', function() {
      var sut = new blackbox();
      var triggerStub = sinon.stub(sut, 'trigger');

      sinon.assert.notCalled(triggerStub);

      sut.write('this is a message');

      sinon.assert.calledOnce(triggerStub);
    });

  });

  describe('#format()', function(){

    before(function() {
      this.uuid = blackbox.Queue._uuid();
      blackbox.Queue._uuid(function() { return 'this-is-a-uniqe-id'; });
    });

    after(function() {
      blackbox.Queue._uuid(this.uuid);
    });

    it('should push to queue', function() {
      var sut = new blackbox();
      sut.format('voice', 'info', ['#login', { user: 11 }]);
      var message = sut.queue.messages[0];
      expect(message[0]).to.equal('voice');
      expect(message[1]).to.equal('info');
      expect(message[2]).to.deep.equal(['#login', { user: 11 }]);
    });

    it('should persist queue in localStorage', function() {
      var sut = new blackbox();
      sut.format('voice', 'info', ['#login']);
      sut.format('voice', 'info', ['#logout']);

      assert.equal(window.localStorage.getItem('blackbox'), JSON.stringify({
        'this-is-a-uniqe-id': [["voice","info",["#login"]],["voice","info",["#logout"]]]
      }));
    });

    it('should perform initial trigger', function() {
      var sut = new blackbox();
      var triggerStub = sinon.stub(sut, 'trigger');

      sinon.assert.notCalled(triggerStub);

      sut.format('voice', 'info', ['#login']);

      sinon.assert.calledOnce(triggerStub);
    });

  });

  describe('#clearQueue()', function() {

    before(function() {
      this.uuid = blackbox.Queue._uuid();
      blackbox.Queue._uuid(function() { return 'this-is-a-uniqe-id'; });
    });

    after(function() {
      blackbox.Queue._uuid(this.uuid);
    });

    it('should clear queued events', function() {
      var expect = chai.expect;
      var sut = new blackbox();
      sut.write('something');
      sut.write('something');
      expect(sut.queue).to.have.length(2);
      sut.clearQueue();
      expect(sut.queue).to.have.length(0);
    });

    it('should remove persisted queue from localStorage', function() {
      var sut = new blackbox();
      sut.write('event-1');
      sut.write('event-2');

      assert.equal(window.localStorage.getItem('blackbox'), JSON.stringify({
        'this-is-a-uniqe-id': ["event-1","event-2"]
      }));

      blackbox.Queue._uuid(function() { return 'this-is-another-uniqe-id'; });

      sut.clearQueue();
      sut.write('event-3');

      assert.equal(window.localStorage.getItem('blackbox'), JSON.stringify({
        'this-is-another-uniqe-id': ["event-3"]
      }));
    });

  });

  describe('#flush()', function() {

    it('should send logs after timeout', function() {
      var sut = new blackbox();
      var stub = sinon.stub(sut, 'send');
      var flushSpy = sinon.spy(sut, 'flush');
      sut.queue.push('something');

      sinon.assert.notCalled(stub);
      sinon.assert.notCalled(flushSpy);

      sut.flush();

      sinon.assert.notCalled(stub);
      sinon.assert.calledOnce(flushSpy);

      this.clock.tick(sut.timeout / 2);

      sinon.assert.notCalled(stub);
      sinon.assert.calledOnce(flushSpy);

      this.clock.tick(sut.timeout / 2); // Timeout reached

      sinon.assert.calledOnce(stub);
      sinon.assert.calledOnce(flushSpy);
    });

    it('should not send logs and wait for next flush if queue is empty', function() {
      var sut = new blackbox();
      var stub = sinon.stub(sut, 'send');
      var flushSpy = sinon.spy(sut, 'flush');

      sinon.assert.notCalled(stub);
      sinon.assert.notCalled(flushSpy);

      sut.flush();

      sinon.assert.notCalled(stub);
      sinon.assert.calledOnce(flushSpy);

      this.clock.tick(sut.timeout / 2);

      sinon.assert.notCalled(stub);
      sinon.assert.calledOnce(flushSpy);

      this.clock.tick(sut.timeout / 2); // Timeout reached

      sinon.assert.notCalled(stub);
      sinon.assert.calledTwice(flushSpy);
    });

  });

  describe('#trigger()', function() {

    it('should trigger once', function() {
      var sut = new blackbox();
      var flushStub = sinon.stub(sut, 'flush');

      sinon.assert.notCalled(flushStub);

      sut.trigger();

      sinon.assert.calledOnce(flushStub);

      sut.trigger();

      sinon.assert.calledOnce(flushStub);
    });

  });

  // TODO: This should expect post on backend. Then we can assert message are Message objects
  describe('#send()', function() {

    it('should POST to API end-point', function() {
      var fakeQuery = { ajax: function() {} };
      var ajaxPromise = { done: function() { return ajaxPromise; }, always: function() { return ajaxPromise; } };
      var doneSpy = sinon.spy(ajaxPromise, 'done');
      var alwaysSpy = sinon.spy(ajaxPromise, 'always');

      var expectation = sinon.mock(fakeQuery).expects('ajax').withArgs({
        contentType: "application/json",
        data: JSON.stringify({
          logs: ["event-1", "event-2", ["voice", "info", ["#login", { user: 11 }]]]
        }),
        dataType: "json",
        type: "POST",
        url: "/blackbox"
      }).once().returns(ajaxPromise);
      var sut = new blackbox().jquery({ jQuery: fakeQuery });
      var flushSpy = sinon.spy(sut, 'flush');

      sut.write('event-1');
      sut.write('event-2');
      sut.format('voice', 'info', ['#login', { user: 11 }]);

      sut.send();

      // Asserts successful flush clears queue
      expect(sut.queue).to.have.length(3);
      doneSpy.callArg(0);
      expect(sut.queue).to.have.length(0);

      // Asserts enqueue next flush
      sinon.assert.calledOnce(flushSpy);
      alwaysSpy.callArg(0);
      sinon.assert.calledTwice(flushSpy);

      expectation.verify();
    });

  });

  // TODO: This should expect post on backend. Then we can assert message are Message objects
  describe('#sendFromStorage()', function() {

    it('should POST stored logs to API end-point', function() {
      var fakeQuery = { ajax: function() {} };
      var ajaxPromise = { done: function() { return ajaxPromise; }, always: function() { return ajaxPromise; } };
      var doneSpy = sinon.spy(ajaxPromise, 'done');
      var alwaysSpy = sinon.spy(ajaxPromise, 'always');

      var expectation = sinon.mock(fakeQuery).expects('ajax').withArgs({
        contentType: "application/json",
        data: JSON.stringify({
          logs: ["event-1", "event-2", ["voice", "info", ["#login"]]]
        }),
        dataType: "json",
        type: "POST",
        url: "/blackbox"
      }).once().returns(ajaxPromise);
      var sut = new blackbox().jquery({ jQuery: fakeQuery });
      var flushSpy = sinon.spy(sut, 'flush');

      window.localStorage.setItem('blackbox', JSON.stringify({
        'this-is-a-uniqe-id': ['event-1'],
        'this-is-another-unique-id': ['event-2'],
        'this-is-a-meta-message': [["voice", "info", ["#login"]]]
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
      var sut = new blackbox().jquery({ jQuery: fakeQuery });
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
          logs: ["event-1", "event-2"]
        }),
        dataType: "json",
        type: "POST",
        url: "/blackbox"
      }).once().returns(ajaxPromise);

      window.localStorage.setItem('blackbox', JSON.stringify({
        'this-is-a-uniqe-id': ['event-1'],
        'this-is-another-uniqe-id': ['event-2']
      }));

      var sut = new blackbox().jquery({ jQuery: fakeQuery });
      var flushSpy = sinon.spy(sut, 'flush');

      doneSpy.callArg(0);
      assert.equal(window.localStorage.getItem('blackbox'), '{}');

      expectation.verify();
    });

  });

  if(window && window.jQuery) {

    describe('Live Browser', function() {

      describe('#send()', function() {

        it('should POST to API end-point', function() {
          var sut = new blackbox().jquery({ url: '/log/blackbox' });

          sut.write('event-1');
          sut.write('event-2');

          this.clock.tick(sut.timeout);

          expect(this.sandbox.server.requests).to.have.length(1);

          var request = this.sandbox.server.requests[0];

          assert.equal(request.url, '/log/blackbox');
          assert.equal(request.method, 'POST');
          assert.equal(request.async, true);

          assert.equal(request.requestHeaders['Content-Type'], 'application/json;charset=utf-8');
          assert.equal(request.requestHeaders['Accept'], 'application/json, text/javascript, */*; q=0.01');
          assert.equal(request.requestHeaders['X-Requested-With'], 'XMLHttpRequest');

          assert.equal(request.requestBody, JSON.stringify({
            logs: ['event-1', 'event-2']
          }));

          this.sandbox.server.respondWith([200, {}, '']);
          this.sandbox.server.respond();

          // Should have 0 after server responds with 200
          expect(sut.queue).to.have.length(0);
        });

        it('should retain logs upon API failure', function() {
          var sut = new blackbox().jquery();

          sut.write('event-1');
          sut.write('event-2');

          expect(sut.queue).to.have.length(2);

          this.clock.tick(sut.timeout);

          // Should have 2 while waiting for server to respond
          expect(sut.queue).to.have.length(2);

          this.sandbox.server.respondWith([500, {}, '']);
          this.sandbox.server.respond();

          // Should have 2 after server responds with 500
          expect(sut.queue).to.have.length(2);
        });

      });

    });

  }

  describe('#isFormatted', function(){

    it('should be false by default', function() {
      var sut = new blackbox();
      expect(sut._isFormatted).to.be.false;
    });

    it('should be true if set', function() {
      var sut = new blackbox({ isFormatted: true });
      expect(sut._isFormatted).to.be.true;
    });

  });

});
