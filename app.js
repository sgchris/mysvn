MySVN = angular.module('MySVN', ['ui.router', 'ngCookies', 'ui.grid', 'ui-notification', 'hljs']);

// fix web API post requests
MySVN.config(['$httpProvider', function($httpProvider) {
	console.log('config1');
	// Use x-www-form-urlencoded Content-Type
	$httpProvider.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded;charset=utf-8';

	/**
	 * The workhorse; converts an object to x-www-form-urlencoded serialization.
	 * @param {Object} obj
	 * @return {String}
	 */
	var param = function(obj) {
		var query = '',
			name, value, fullSubName, subName, subValue, innerObj, i;

		for (name in obj) {
			value = obj[name];

			if (value instanceof Array) {
				for (i = 0; i < value.length; ++i) {
					subValue = value[i];
					fullSubName = name + '[' + i + ']';
					innerObj = {};
					innerObj[fullSubName] = subValue;
					query += param(innerObj) + '&';
				}
			} else if (value instanceof Object) {
				for (subName in value) {
					subValue = value[subName];
					fullSubName = name + '[' + subName + ']';
					innerObj = {};
					innerObj[fullSubName] = subValue;
					query += param(innerObj) + '&';
				}
			} else if (value !== undefined && value !== null)
				query += encodeURIComponent(name) + '=' + encodeURIComponent(value) + '&';
		}

		return query.length ? query.substr(0, query.length - 1) : query;
	};

	// Override $http service's default transformRequest
	$httpProvider.defaults.transformRequest = [function(data) {
		return angular.isObject(data) && String(data) !== '[object File]' ? param(data) : data;
	}];
	
}]);

// define the routing
MySVN.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
	$urlRouterProvider.otherwise("/commits");
	
	$stateProvider
		.state('home', {
			url: '/',
			redirectTo: '/commits'
		})
		.state('commits', {
			url: '/commits',
			controller: 'HomepageController',
			templateUrl: '/views/commits.html'
		})
		.state('repo-browser', {
			url: '/repo-browser',
			controller: 'RepoBrowserController',
			templateUrl: '/views/repo-browser.html'
		});
}]);


MySVN.run(['$rootScope', function($rootScope) {
	console.log('run function');
	
	$rootScope.getWindowHeight = function() {
		return Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
	};
	
	$rootScope.fixHeights = function() {
		var h = $rootScope.getWindowHeight();
		$rootScope.panelHeight = (h - 150) + 'px';
	};
	
	// watch window height, and fix heights of the panels
	$rootScope.$watch($rootScope.getWindowHeight, $rootScope.fixHeights);
	
}]);
