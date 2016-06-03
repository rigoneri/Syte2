'use strict';

describe('Controller: StreamCtrl', function () {

  // load the controller's module
  beforeEach(module('clientApp'));

  var StreamCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    StreamCtrl = $controller('StreamCtrl', {
      $scope: scope
      // place here mocked dependencies
    });
  }));

  it('should attach a list of awesomeThings to the scope', function () {
    expect(StreamCtrl.awesomeThings.length).toBe(3);
  });
});
