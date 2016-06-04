'use strict';

angular.module('clientApp')

  .controller('GithubCtrl', ['$scope', '$rootScope', '$http',
    function($scope, $rootScope, $http) {
      $scope.user = {};
      $scope.repos = [];
      $scope.activities = [];

      var fetching = false;

      function _getRepos(cb) {
        if (fetching) {
          return;
        }

        fetching = true;
        $http.get('/github/repos').success(function(data, status) {
          if (status === 200 && data && data.length) {
            $scope.repos = data;
          } 
          fetching = false;
          cb();
        }).error(function(data) {
          console.log('Error', data);
          fetching = false;
          cb();
        });
      }

      function _getActivity(cb) {
        if (fetching) {
          return;
        }

        fetching = true;
        $http.get('/github/activity').success(function(data, status) {
          if (status === 200 && data && data.length) {
            $scope.activities = data;
          } 
          fetching = false;
          cb();
        }).error(function(data) {
          console.log('Error', data);
          fetching = false;
          cb();
        });
      }

      function _getUser(cb) {
        $http.get('/github/user').success(function(data, status) {
          if (status === 200 && data) {
            $scope.user = data;
            _getRepos(function() {
              _getActivity(cb);
            });
          }
        }).error(function(data) {
          console.log('Error', data);
          cb();
        });
      }

      function _animateEnter(extraTime) {
        if (!$scope.animateEnter) {
          var time = $rootScope.firstEnter ? 500: 1000;
          time += extraTime <= 500 ? extraTime : 500;

          setTimeout(function() {
            $scope.animateEnter = true;
            $scope.visible = true;
            if (!$scope.$$phase) {
               $scope.$apply();
            }
            if (!$rootScope.firstEnter) {
              $rootScope.firstEnter = true;
            }
            setTimeout(function() {
              $scope.animateEnter = false;
              if (!$scope.$$phase) {
                $scope.$apply();
              } 
            }, 1200);
          }, time);
        }
      }

      _getUser(function() { 
        _animateEnter(0);
      });
    }
  ])


  .directive('githubActivity', function() {
    return {
      restrict: 'E',
      scope: {
        item: '='
      },
      templateUrl: 'templates/github/activity.html'
    };
  });