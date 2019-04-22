'use strict';

angular.module('clientApp')

  .controller('TwitterCtrl', ['$scope', '$rootScope', '$http', '$window', 'ModalService',
    function($scope, $rootScope, $http, $window, ModalService) {
      $scope.user = {};
      $scope.tweets = [];

      var streamElement = angular.element(document.getElementById('twitter-page'))[0];
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
            _getTweets(function() {
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
      function _getTweets(cb) {
        if (fetching || emptyResponses > 2) {
          return;
        }

        fetching = true;
        $http.get('/twitter/' + currentPage).success(function(data, status) {
          if (status === 200 && data && data.length) {
            $scope.tweets = $scope.tweets.concat(data);

            if ($scope.tweets.length < 7) {
              //since the list of tweets is month based we make sure there's enough
              //data to be displayed on load by going back a month.
              fetching = false;
              currentPage++;
              _getTweets(cb);
            } else {
              fetching = false;
              running = false;
              emptyResponses = 0;
              cb();
            }
          } else {
            emptyResponses++;
            fetching = false;
            if (emptyResponses <= 2) {
              currentPage++;
              _getTweets(cb);
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
        $http.get('/twitter/user').success(function(data, status) {
          if (status === 200 && data) {
            $scope.user = data;
            _getTweets(cb);
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

      $scope.openPicture = function(picture) {
        if (picture.tweetID) {
          $window.open('https://twitter.com/' + $scope.user.username + '/status/' + picture.tweetID);
        }
      };

      $scope.openPost = function(item, index) {
        ModalService.showModal({
          templateUrl: 'templates/twitter/details.html',
          controller: 'TwitterDetailsCtrl',
          inputs: {
            item: item,
            idx: index
          }
        });
      };
    }
  ])

  .directive('twitterPost', ['ModalService', function(ModalService) {
    return {
      restrict: 'E',
      scope: {
        item: '='
      },
      templateUrl: 'templates/twitter/post.html',
      link: function(scope) {
        scope.openPost = function(item, index) {
          ModalService.showModal({
            templateUrl: 'templates/twitter/details.html',
            controller: 'TwitterDetailsCtrl',
            inputs: {
              item: item,
              idx: index
            }
          });
        };
      }
    };
  }])

  .controller('TwitterDetailsCtrl', ['$scope', 'close', 'item', 'idx',
    function($scope, close, item, idx) {
      $scope.close = close;
      $scope.item = item;
      $scope.playing = false;

      $scope.morePictures = false;
      $scope.picture = null;
      var pictureIndex = idx || 0;
      if (item.pictures && !item.video) {
        if (item.pictures.length > 1) {
          $scope.morePictures = true;
          $scope.picture = item.pictures[pictureIndex].url;
        } else {
          $scope.picture = item.pictures[pictureIndex].url;
        }
      }

      $scope.nextPicture = function() {
        pictureIndex++;
        if (pictureIndex >= item.pictures.length) {
          pictureIndex = 0;
        }
        $scope.picture = item.pictures[pictureIndex].url;
        if (!$scope.$$phase) {
          $scope.$apply();
        }
      };

      $scope.prevPicture = function() {
        pictureIndex--;
        if (pictureIndex < 0) {
          pictureIndex = item.pictures.length -1;
        }
        $scope.picture = item.pictures[pictureIndex].url;
        if (!$scope.$$phase) {
          $scope.$apply();
        }
      };

      $scope.playVideo = function() {
        var video = angular.element(document.querySelector('#video'));
        if (video[0].paused === true) {
            video[0].play();
            $scope.playing = true;
        } else {
            video[0].pause();
            $scope.playing = false;
        }

        video[0].onended = function() {
          $scope.playing = false;
          if (!$scope.$$phase) {
            $scope.$apply();
          }
        };
      };
    }
  ]);
