'use strict';

angular
  .module('clientApp', [
    'ngAnimate',
    'ngRoute',
    'ngSanitize',
    'angularMoment',
    'angularModalService',
    'angularLazyImg'
  ])
  .config(function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'templates/stream/index.html',
        controller: 'StreamCtrl'
      })
      .when('/twitter', {
        templateUrl: 'templates/twitter/index.html',
        controller: 'TwitterCtrl'
      })
      .when('/dribbble', {
        templateUrl: 'templates/dribbble/index.html',
        controller: 'DribbbleCtrl'
      })
      .when('/instagram', {
        templateUrl: 'templates/instagram/index.html',
        controller: 'InstagramCtrl'
      })
      .when('/youtube', {
        templateUrl: 'templates/youtube/index.html',
        controller: 'YoutubeCtrl'
      })
      .when('/github', {
        templateUrl: 'templates/github/index.html',
        controller: 'GithubCtrl'
      })
      .when('/tumblr', {
        templateUrl: 'templates/tumblr/index.html',
        controller: 'TumblrCtrl'
      })
      .when('/post/:postId', {
        templateUrl: 'templates/tumblr/index.html',
        controller: 'TumblrViewPostCtrl'
      })
      .when('/foursquare', {
        templateUrl: 'templates/foursquare/index.html',
        controller: 'FoursquareCtrl'
      })
      .when('/spotify', {
        templateUrl: 'templates/lastfm/index.html',
        controller: 'LastfmCtrl'
      })
      .otherwise({
        redirectTo: '/'
      });
  })
  .run(['$rootScope', '$window',  function($rootScope, $window) {
    $rootScope.menuOpened = false;
    $rootScope.$on('$routeChangeStart', function() {
      $rootScope.menuOpened = false;
      setTimeout(function() {
        $window.scrollTo(0, 0);
      }, 500);
    });
  }])
  .directive('mainNav', ['$rootScope', function($rootScope) {
    return {
      restrict: 'E',
      templateUrl: 'templates/nav.html',
      link: function(scope) {
        scope.toggleMenu = function() {
          $rootScope.menuOpened = !$rootScope.menuOpened;
        };
      }
    };
  }])
  .filter('trusted', ['$sce', function ($sce) {
    return function(url) {
        return $sce.trustAsResourceUrl(url);
    };
  }]);
