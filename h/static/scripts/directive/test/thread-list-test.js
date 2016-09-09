'use strict';

var angular = require('angular');

var EventEmitter = require('tiny-emitter');
var inherits = require('inherits');

var threadList = require('../thread-list');
var util = require('./util');

var fixtures = {
  thread: {
    children: [{
      id: '1',
      annotation: {id: '1', text: 'text'},
      children: [{
        id: '2',
        annotation: {id: '2', text: 'areply'},
        children: [],
        visible: true,
      }],
      visible: true,
    }],
  },
};

var fakeVirtualThread;

function FakeVirtualThreadList($scope, $window, rootThread) {

  fakeVirtualThread = this; // eslint-disable-line consistent-this

  var thread = rootThread;

  this.setRootThread = function (_thread) {
    thread = _thread;
  };
  this.notify = function () {
    this.emit('changed', {
      offscreenLowerHeight: 10,
      offscreenUpperHeight: 20,
      visibleThreads: thread.children,
    });
  };
  this.detach = sinon.stub();
  this.yOffsetOf = function () {
    return 42;
  };
}
inherits(FakeVirtualThreadList, EventEmitter);

describe('threadList', function () {
  function createThreadList(inputs) {
    var defaultInputs = {
      ctrl: {},
      thread: fixtures.thread,
      onForceVisible: sinon.stub(),
      onFocus: sinon.stub(),
      onSelect: sinon.stub(),
      onSetCollapsed: sinon.stub(),
    };

    var element = util.createDirective(document, 'threadList',
      Object.assign({}, defaultInputs, inputs));

    return element;
  }

  before(function () {
    angular.module('app', [])
      .directive('threadList', threadList);
  });

  beforeEach(function () {
    angular.mock.module('app', {
      VirtualThreadList: FakeVirtualThreadList,
    });
  });

  it('displays the children of the root thread', function () {
    var element = createThreadList();
    fakeVirtualThread.notify();
    element.scope.$digest();
    var children = element[0].querySelectorAll('annotation-thread');
    assert.equal(children.length, 1);
  });

  describe('#ctrl.scrollIntoView', function () {
    it('scrolls the annotation into view', function () {
      var inputs = {
        ctrl: {},
      };
      var spy = sinon.stub(window, 'scroll');
      createThreadList(inputs);
      inputs.ctrl.scrollIntoView('2');
      assert.called(spy);
      spy.restore();
    });
  });

  it('calls onFocus() when the user hovers an annotation', function () {
    var inputs = {
      onFocus: {
        args: ['annotation'],
        callback: sinon.stub(),
      },
    };
    var element = createThreadList(inputs);
    fakeVirtualThread.notify();
    element.scope.$digest();
    var annotation = element[0].querySelector('.thread-list__card');
    util.sendEvent(annotation, 'mouseover');
    assert.calledWithMatch(inputs.onFocus.callback,
      sinon.match(fixtures.thread.children[0].annotation));
  });

  it('calls onSelect() when a user clicks an annotation', function () {
    var inputs = {
      onSelect: {
        args: ['annotation'],
        callback: sinon.stub(),
      },
    };
    var element = createThreadList(inputs);
    fakeVirtualThread.notify();
    element.scope.$digest();
    var annotation = element[0].querySelector('.thread-list__card');
    util.sendEvent(annotation, 'click');
    assert.calledWithMatch(inputs.onSelect.callback,
      sinon.match(fixtures.thread.children[0].annotation));
  });
});
