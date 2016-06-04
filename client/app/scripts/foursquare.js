/*globals  GOOGLE_MAPS_KEY */
'use strict';

angular.module('clientApp')

  .controller('FoursquareCtrl', ['$scope', '$rootScope', '$http', '$window', 'moment',
    function($scope, $rootScope, $http, $window, moment) {
      $scope.user = {};
      $scope.items = [];
      $scope.mapPage = 0;

      var map;
      var streamElement = angular.element(document.getElementById('foursquare-page'))[0];
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
            _getCheckins(function() {
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
      var firstPage = true;
      function _getCheckins(cb) {
        if (fetching || emptyResponses > 2) {
          return;
        }

        fetching = true;
        $http.get('/foursquare/' + currentPage).success(function(data, status) {
          if (status === 200 && data && data.length) {
            $scope.items = $scope.items.concat(data);

            if (firstPage) {
              firstPage = false;
              $scope.mapPage = currentPage;
              _setupMap(data, null);
            }

            if (currentPage === 0 && data.length < 10) {
              fetching = false;
              currentPage++;
              _getCheckins(cb);
            } else  {
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
              _getCheckins(cb);
            }
          }
        }).error(function(data) {
          console.log('Error', data);
          fetching = false;
          running = false;
          cb();
        });
      }

      function _setupMap(data, cb) {
        var today = moment();
        if ($scope.mapPage > 0) {
          today.subtract($scope.mapPage, 'months');
        }
        $scope.monthTitleDate = today.format('MMMM YYYY');
        $scope.totalCheckins = data ? data.length : 0;

        if (!data || data.length === 0) {
          $scope.mapCategories = [];
          $scope.mapData = [];

          if (!$scope.$$phase) {
            $scope.$apply();
          }
          if (cb) {
            cb();
          }
          return;
        }

        var groupedByLocation = [];
        var groupedCategories = [];

        for (var i=0; i<data.length; i++) {
          var checkin = data[i];

          var foundLocation = false;
          for (var l=0; l<groupedByLocation.length; l++) {
            var item = groupedByLocation[l];
            if (item.lat === checkin.lat && item.lng === checkin.lng) {
              foundLocation = true;
              break;
            }
          }

          if (!foundLocation) {
            groupedByLocation.push(checkin);
          }

          if (checkin.category) {
            var foundCategory = false;
            for (var c=0; c<groupedCategories.length; c++) {
              var category = groupedCategories[c];
              if (category.title === checkin.category) {
                category.count += 1;
                foundCategory = true;
                break;
              }
            }

            if (!foundCategory) {
              groupedCategories.push({
                'title': checkin.category,
                'icon': checkin.icon,
                'count': 1,
              });
            }
          }
        }

        groupedCategories.sort(function(a, b) {
          return a.count < b.count ? 1 : -1;
        });

        $scope.mapCategories = groupedCategories;

        $window.GoogleMapsLoader.KEY = GOOGLE_MAPS_KEY;
        $window.GoogleMapsLoader.load(function(google) {
          map = new google.maps.Map(document.getElementById('foursquare-map'), {
            center: { 
              lat: groupedByLocation[0].lat,
              lng: groupedByLocation[0].lng
            }, 
            zoom: 11,
            scrollwheel: false,
            options: {
              styles: [{'featureType':'all','elementType':'labels.text.fill','stylers':[{'color':'#000000'},{'lightness':'40'}]},{'featureType':'all','elementType':'labels.text.stroke','stylers':[{'visibility':'simplified'},{'color':'#000000'},{'lightness':16}]},{'featureType':'all','elementType':'labels.icon','stylers':[{'visibility':'off'}]},{'featureType':'administrative','elementType':'geometry.fill','stylers':[{'color':'#273239'},{'lightness':'52'},{'visibility':'off'}]},{'featureType':'administrative','elementType':'geometry.stroke','stylers':[{'weight':'1.00'},{'visibility':'on'},{'lightness':'-61'}]},{'featureType':'administrative.province','elementType':'labels.text','stylers':[{'visibility':'simplified'}]},{'featureType':'landscape','elementType':'geometry','stylers':[{'color':'#273239'},{'lightness':'-18'},{'saturation':'0'}]},{'featureType':'landscape.natural','elementType':'geometry.fill','stylers':[{'visibility':'on'}]},{'featureType':'poi','elementType':'geometry','stylers':[{'color':'#273239'},{'lightness':'-9'},{'visibility':'on'}]},{'featureType':'road.highway','elementType':'geometry.fill','stylers':[{'color':'#111619'},{'lightness':'5'}]},{'featureType':'road.highway','elementType':'geometry.stroke','stylers':[{'weight':0.2},{'color':'#273239'},{'lightness':'-50'},{'visibility':'off'}]},{'featureType':'road.arterial','elementType':'geometry','stylers':[{'color':'#111619'},{'lightness':'6'}]},{'featureType':'road.arterial','elementType':'labels.text','stylers':[{'visibility':'off'}]},{'featureType':'road.local','elementType':'geometry','stylers':[{'color':'#111619'},{'lightness':'3'}]},{'featureType':'road.local','elementType':'labels.text','stylers':[{'visibility':'off'}]},{'featureType':'transit','elementType':'geometry','stylers':[{'color':'#273239'},{'lightness':'-9'}]},{'featureType':'water','elementType':'geometry','stylers':[{'color':'#182125'},{'lightness':'-12'},{'saturation':'0'},{'gamma':'1.00'}]},{'featureType':'water','elementType':'labels.text','stylers':[{'visibility':'simplified'}]}],
              disableDefaultUI: true
            }
          });

          //Auto center & scale the map based on the last 5 checkins...
          var bounds = new google.maps.LatLngBounds();
          var last5Group = data.slice(0, 5);
          for (var i=0; i< last5Group.length; i++) {
            var checkin = last5Group[i];
            var latLng = new google.maps.LatLng({lat: checkin.lat, lng: checkin.lng});
            bounds.extend(latLng);
          }
          map.fitBounds(bounds);

          var overlay = new google.maps.OverlayView();
          overlay.draw = function() {};
          overlay.onAdd = function() {
            var projection = this.getProjection();

            for (var i=0; i< groupedByLocation.length; i++) {
              var checkin = groupedByLocation[i];
              var latLng = new google.maps.LatLng({lat: checkin.lat, lng: checkin.lng});
              var pixel = projection.fromLatLngToContainerPixel(latLng);
              checkin.x = pixel.x;
              checkin.y = pixel.y;
            }

            $scope.mapData = groupedByLocation;

            if (!$scope.$$phase) {
              $scope.$apply();
            }

            if (cb) {
              cb();
            }
          };
          overlay.setMap(map);
        });
      }

      function _getUser(cb) {
        $http.get('/foursquare/user').success(function(data, status) {
          if (status === 200 && data) {
            $scope.user = data;
            _getCheckins(cb);
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

      function _getMapCheckins(cb) {
        if (fetching) {
          return;
        }

        fetching = true;
        $http.get('/foursquare/' + $scope.mapPage).success(function(data, status) {
          if (status === 200 && data && data.length) {
            fetching = false;
            cb(data);
          } else {
            fetching = false;
            cb(null);
          } 
        }).error(function(data) {
          console.log('Error', data);
          fetching = false;
          cb(null);
        });
      }

      var changingMonths = false;
      $scope.previousMonth = function() {
        if (changingMonths) {
          return;
        }

        changingMonths = true;
        _animateMonthHide(function() {
          $window.GoogleMapsLoader.release();
          $scope.mapPage += 1;
          _getMapCheckins(function(data) {
            _setupMap(data, function() {
              _animateMonthShow();
            });
          });
        });
      };

      $scope.nextMonth = function() {
        if (changingMonths) {
          return;
        }

        changingMonths = true;
        _animateMonthHide(function() {
          $window.GoogleMapsLoader.release();
          $scope.mapPage -= 1;
          if ($scope.mapPage < 0) {
            $scope.mapPage = 0;
          }

          _getMapCheckins(function(data) {
            _setupMap(data, function() {
              _animateMonthShow();
            });
          });
        });
      };

      function _animateMonthHide(cb) {
        $scope.animateShow = false;
        $scope.animateBetween = false;
        $scope.animateHide = true;
        if (!$scope.$$phase) {
          $scope.$apply();
        }

        setTimeout(function() {
          $scope.animateHide = false;
          $scope.animateBetween = true;
          if (!$scope.$$phase) {
            $scope.$apply();
          }
          cb();
        }, 1000);
      }

      function _animateMonthShow() {
        $scope.animateHide = false;
        $scope.animateBetween = false;
        $scope.animateShow = true;
        $rootScope.$emit('lazyImg:refresh');
        if (!$scope.$$phase) {
          $scope.$apply();
        }

        setTimeout(function() {
          $scope.animateBetween = false;
          $scope.animateShow = false;
          if (!$scope.$$phase) {
            $scope.$apply();
          }
          changingMonths = false;
        }, 1000);
      }

      $scope.$on('$destroy', function() {
        $window.GoogleMapsLoader.release();
      });
    }
  ])

  .directive('foursquareStreamPost', function() {
    return {
      restrict: 'E',
      scope: {
        item: '='
      },
      templateUrl: 'templates/stream/foursquare.html'
    };
  });