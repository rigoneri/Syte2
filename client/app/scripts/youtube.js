'use strict';

angular.module('clientApp')

  .controller('YoutubeCtrl', ['$scope', '$rootScope', '$http', '$window', 'ModalService',
    function($scope, $rootScope, $http, $window, ModalService) {
      $scope.user = {};
      $scope.posts = [];

      var streamElement = angular.element(document.getElementById('youtube-page'))[0];
      var windowElement = angular.element($window)[0];
      var currentPage = 0;
      var running = false;
      var fetching = false;
      
      function handleScroll() {
        if (running) {
          return;
        }

        running = true;
        requestAnimationFrame(function() {
          if (windowElement.scrollY + windowElement.innerHeight > streamElement.clientHeight - 200) {
            currentPage++;
            running = true;
            _getPosts(function() {
              if (!$scope.$$phase) {
                $scope.$apply();
              }
            });
            return;
          }

          running = false;
        });
      }
      
      angular.element($window).bind('scroll', handleScroll);
      $scope.$on('$destroy', function() {
        angular.element($window).unbind('scroll', handleScroll);
      });

      var emptyResponses = 0;
      function _getPosts(cb) {
        if (fetching || emptyResponses > 2) {
          return;
        }

        fetching = true;
        $http.get('/youtube/' + currentPage).success(function(data, status) {
          if (status === 200 && data && data.length) {
            $scope.posts = $scope.posts.concat(data);

            fetching = false;
            running = false;
            emptyResponses = 0;
            cb();
          } else {
            emptyResponses++;
            fetching = false;
            if (emptyResponses <= 2) {
              currentPage++;
              _getPosts(cb);
            }
          }
        }).error(function(data) {
          console.log('Error', data);
          fetching = false;
          running = false;
          cb();
        });
      }

      function _getUser(cb) {
        $http.get('/youtube/user').success(function(data, status) {
          if (status === 200 && data) {
            $scope.user = data;
            _getPosts(cb);
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

      $scope.openPost = function(item) {
        ModalService.showModal({
          templateUrl: 'templates/youtube/details.html',
          controller: 'YoutubeDetailsCtrl',  
          inputs: {
            item: item
          }
        });
      };
    }
  ])

  .directive('youtubePost', ['$window', 'ModalService', function($window, ModalService) {
    return {
      restrict: 'E',
      scope: {
        item: '='
      },
      templateUrl: 'templates/stream/youtube.html',
      link: function(scope) {
        scope.openPost = function(item) {
          ModalService.showModal({
            templateUrl: 'templates/youtube/details.html',
            controller: 'YoutubeDetailsCtrl',
            inputs: {
              item: item
            }
          });
        };
      }
    };
  }])

  .controller('YoutubeDetailsCtrl', ['$scope', 'close', 'item',
    function($scope, close, item) {
      $scope.close = close;
      $scope.item = item;
      $scope.youtubeEmbed = 'https://www.youtube.com/embed/' + item.id;
    }
  ]);