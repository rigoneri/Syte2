'use strict';

angular.module('clientApp')
  .controller('StreamCtrl', ['$window', '$scope', '$rootScope', '$filter', '$http', 'moment', 
    function($window, $scope, $rootScope, $filter, $http, moment) {
      $scope.groups = {};

      var streamElement = angular.element(document.getElementById('main-stream'))[0];
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
            _getStream(function() {
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

      var todayFormated = moment().format('YYYY-MM-DD');
      var yesterdayFormatted = moment().subtract(1, 'day').format('YYYY-MM-DD');
      var currentYear = moment().format('YYYY');

      var emptyResponses = 0;
      function _getStream(cb) {
        if (fetching || emptyResponses > 2) {
          return;
        }

        fetching = true;
        $http.get('/stream/' + currentPage).success(function(data, status) {
          if (status === 200 && data && data.length) {
            for (var i=0; i<data.length; i++) {
              var post = data[i];
              post.date = moment(post.date).toDate();
              var day = moment(post.date).format('YYYY-MM-DD');

              if ($scope.groups[day]) {
                $scope.groups[day].items.push(post);
              } else {
                var title;
                if (todayFormated === day) {
                  title = 'Today';
                } else if (yesterdayFormatted === day) {
                  title = 'Yesterday';
                } else if (currentYear !== day.substring(0, 4)){
                  title = $filter('date')(moment(day).toDate(), 'EEEE, MMMM d, yyyy');
                } else {
                  title = $filter('date')(moment(day).toDate(), 'EEEE, MMMM d');
                }

                $scope.groups[day] = {
                  title: title,
                  items: [post]
                };
              }
            }

            if (currentPage === 0 && data.length < 7) {
              //since the stream is month based we make sure there's enough
              //data to be displayed on load by going back a month.
              fetching = false;
              currentPage++;
              _getStream(cb);
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
              _getStream(cb);
            } else {
              cb();
            }
          }
        }).error(function(data) {
          console.log('Error', data);
          fetching = false;
          running = false;
        });
      }

      function _animateEnter() {
        if (!$scope.animateEnter) {
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
          }, $rootScope.firstEnter ? 500 : 1000);
        }
      }

      _getStream(_animateEnter);
    }]);