'use strict';

angular.module('clientApp')

  .controller('LastfmCtrl', ['$scope', '$rootScope', '$http', '$window',
    function($scope, $rootScope, $http, $window) {
      $scope.user = {};
      $scope.items = [];

      var fetching = false;

      function _getTracks(cb) {
        if (fetching) {
          return;
        }

        fetching = true;
        $http.get('/lastfm/activity').success(function(data, status) {
          if (status === 200 && data && data.length) {
            $scope.items = $scope.items.concat(data);
            fetching = false;
          }
          cb();
        }).error(function(data) {
          console.log('Error', data);
          fetching = false;
          cb();
        });
      }

      function _geTopStats(cb) {
        if (fetching) {
          return;
        }

        fetching = true;
        $http.get('/lastfm/top').success(function(data, status) {
          if (status === 200 && data) {
            $scope.topArtists = data.artists ? data.artists : null;
            $scope.topAlbums = data.albums ? data.albums : null;
            $scope.topTracks = data.tracks ? data.tracks : null;
            if (!$scope.$$phase) {
               $scope.$apply();
            }
            fetching = false;
          }
          cb();
        }).error(function(data) {
          console.log('Error', data);
          fetching = false;
          cb();
        });
      }

      function _getUser(cb) {
        $http.get('/lastfm/user').success(function(data, status) {
          if (status === 200 && data) {
            $scope.user = data;
            _geTopStats(function() {
              _getTracks(cb);
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
        var start = new Date().getTime();
        var didLoadAnimateFirst = false;

        var loadTimeout = setTimeout(function() { 
          if (!didLoadAnimateFirst) {
            didLoadAnimateFirst = true;
            _animateEnter(0);
          }
        }, 2000);

        $rootScope.$on('lazyImg:success', function() {          
          if (!didLoadAnimateFirst) {
            clearTimeout(loadTimeout);
            var elapsed = new Date().getTime() - start;
            didLoadAnimateFirst = true;
            _animateEnter(elapsed);
            return;
          }
        });

        $rootScope.$on('lazyImg:error', function() {        
          if (!didLoadAnimateFirst) {
            clearTimeout(loadTimeout);
            var elapsed = new Date().getTime() - start;
            didLoadAnimateFirst = true;
            _animateEnter(elapsed);
            return;
          }
        });
      });

      $scope.openTop = function(item) {
        if (item.url) {
          $window.open(item.url);
        }
      };
    }
  ])

  .directive('lastfmActivity', function() {
    return {
      restrict: 'E',
      scope: {
        item: '='
      },
      templateUrl: 'templates/stream/lastfm.html'
    };
  });