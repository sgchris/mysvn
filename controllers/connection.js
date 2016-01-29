MySVN.controller('ConnectionController', ['$scope', '$rootScope', '$state', '$http', '$cookies', '$timeout', '$sce', 'Notification', 
	function($scope, $rootScope, $state, $http, $cookies, $timeout, $sce, Notification) {
	
	$rootScope.isConnected = false,
	$rootScope.lastRevisionNumber = '';
	$rootScope.baseSvnUrl = '';
	
	// user provided data
	$rootScope.url = '',
	$rootScope.login = '',
	$rootScope.password = '',
	
	$scope.connection = {
		
		// status
		isConnecting: false,
		
		// connection box
		isOpen: true,
		toggleConnectionBox: function() {
			$scope.connection.isOpen = !$scope.connection.isOpen;
		},
		
		// load initial state
		loadLocallyStoredCredentials: function() {
			var storedConnection = $cookies.get('svn_connection');
			if (storedConnection) {
				try {
					storedConnection = JSON.parse(storedConnection);
					
					// connect immediately if credentials supplied
					if (storedConnection.url && storedConnection.login && storedConnection.password) {
						$rootScope.url = storedConnection.url;
						$rootScope.login = storedConnection.login;
						$rootScope.password = storedConnection.password;
					
						$scope.connection.connect();
					}
				} catch (e) {
					console.error('cannot load stored connection data', e);
				}
			}
		},
		
		store: function() {
			var connectionObjectJSON = JSON.stringify({
				url: $scope.url,
				login: $scope.login,
				password: $scope.password
			});
			
			var expireDate = new Date();
			expireDate.setDate(expireDate.getDate() + 30); // 1 month
			
			$cookies.put('svn_connection', connectionObjectJSON, {
				expires: expireDate
			});
		},
		
		// svn repo data
		baseSvnUrl: '',
		lastRevisionNumber: 0,
		
		// dis/connection callback
		connect: function(callbackFn) {
			if ($scope.isConnected) {
				// disconnect
				$rootScope.lastRevisionNumber = '';
				$rootScope.baseSvnUrl = '';
				
				$rootScope.isConnected = false;
				
			} else {
				// store the connection date locally
				$scope.connection.store();
				
				$scope.connection.isConnecting = true;
				$http({
					method: 'POST',
					url: '/api/get_info.php',
					data: {
						url: $scope.url,
						login: $scope.login,
						password: $scope.password,
					}
				}).success(function(res) {
					if (res.result == 'ok') {
						$rootScope.lastRevisionNumber = res.lastRevisionNumber;
						$rootScope.baseSvnUrl = res.baseUrl;
						
						$rootScope.isConnected = true;
						
						// hide the connection box
						$timeout(function() {
							$scope.connection.isOpen = false;
						}, 500);
						
						if (typeof(callbackFn) == 'function') {
							callbackFn();
						}
					}
				}).finally(function() {
					$scope.connection.isConnecting = false;
				});
			}
		}
	};
	
		
	// load initial state (from cookies)
	$scope.connection.loadLocallyStoredCredentials();

}]);
