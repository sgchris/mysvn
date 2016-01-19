MySVN.controller('HomepageController', ['$scope', '$http', '$cookies', '$timeout', function($scope, $http, $cookies, $timeout) {
	
	$scope.connection = {
		
		// user provided data
		url: '',
		login: '',
		password: '',
		
		// status
		isConnected: false,
		isConnecting: false,
		
		// connection box
		isOpen: false,
		toggleConnectionBox: function() {
			$scope.connection.isOpen = !$scope.connection.isOpen;
		},
		
		// load initial state
		load: function() {
			var storedConnection = $cookies.get('svn_connection');
			if (storedConnection) {
				try {
					storedConnection = JSON.parse(storedConnection);
					$scope.connection.url = storedConnection.url;
					$scope.connection.login = storedConnection.login;
					$scope.connection.password = storedConnection.password;
				} catch (e) {
					console.error('cannot load stored connection data', e);
				}
			}
		},
		
		store: function() {
			var connectionObjectJSON = JSON.stringify({
				url: $scope.connection.url,
				login: $scope.connection.login,
				password: $scope.connection.password
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
		
		// connection callback
		connect: function() {
			if ($scope.connection.isConnected) {
				// disconnect
				$scope.connection.lastRevisionNumber = '';
				$scope.connection.baseSvnUrl = '';
				
				$scope.connection.isConnected = false;
			} else {
				
				if ($scope.connection.url.length > 0 && 
					$scope.connection.login.length > 0 && 
					$scope.connection.password.length > 0
				) {
					// store the connection date locally
					$scope.connection.store();
					
					$scope.connection.isConnecting = true;
					$http({
						method: 'POST',
						url: '/api/get_info.php',
						data: {
							url: $scope.connection.url,
							login: $scope.connection.login,
							password: $scope.connection.password,
						}
					}).success(function(res) {
						if (res.result == 'ok') {
							$scope.connection.lastRevisionNumber = res.lastRevisionNumber;
							$scope.connection.baseSvnUrl = res.baseUrl;
							
							$scope.connection.isConnected = true;
							
							// hide the connection box
							$timeout(function() {
								$scope.connection.isOpen = false;
							}, 1000);
						}
					}).finally(function() {
						$scope.connection.isConnecting = false;
					});
				}
			}
		}
	};
	
	// load initial state (from cookies)
	$scope.connection.load();
	
}]);


