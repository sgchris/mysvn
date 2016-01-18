MySVN.controller('HomepageController', ['$scope', '$http', function($scope, $http) {
	
	$scope.connection = {
		
		// user provided data
		url: '',
		login: '',
		password: '',
		
		// status
		isConnected: false,
		
		// connection box
		isOpen: false,
		toggleConnectionBox: function() {
			$scope.connection.isOpen = !$scope.connection.isOpen;
		},
		
		// connection
		baseSvnUrl: '',
		lastRevisionNumber: 0,
		connect: function() {
			if ($scope.connection.url.length > 0 && 
				$scope.connection.login.length > 0 && 
				$scope.connection.password.length > 0
			) {
				$http({
					method: 'POST',
					url: '/api/get_info.php',
					data: {
						url: $scope.connection.url,
						login: $scope.connection.login,
						password: $scope.connection.password,
					}
				}).success(function(res) {
					console.log('connection connect res', res);
				});
			}
		}
	};
	
	
}]);

