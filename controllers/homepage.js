webApp.controller('HomepageController', ['$scope', '$modal', function($scope, $modal){
	$scope.items = ["Apple", "Orange", "Blueberry"];

	// set the default connection
	$scope.connection = {
		svnurl: '',
		login: '',
		password: ''
	}; 
	
	$scope.setCredentials = function() {
		$modal.open({
			templateUrl: 'setCredentials.html',
			resolve: {
				connection: function() {
					return $scope.connection;
				}
			},
			controller: ['$scope', '$modalInstance', 'connection', '$http',
				function($scope, $modalInstance, connection, $http) {
					// take the data from the main controller
					$scope.svnurl = connection.svnurl;
					$scope.login = connection.login;
					$scope.password = connection.password;
					
					$scope.checkingConnection = false;

					// define callbacks functions for the buttons
					$scope.setCredentialsOk = function() {
						$scope.checkingConnection = false;
						$http({
							method: 'POST',
							url: BASE_PATH + 'api/check_connection.php',
							data: {
								svnurl: $scope.svnurl,
								login: $scope.login,
								password: $scope.password,
							}
						}).then(function(res) {
							console.log('connection result: ', res);
							
							$modalInstance.close({
								svnurl: $scope.svnurl,
								login: $scope.login,
								password: $scope.password 
							});
						}, function() {
							console.error('check connection failure');
						})
					};
					$scope.setCredentialsCancel = function() {
						$modalInstance.dismiss();
					};
				}
			],
			size: 'sm'
		}).result.then(function(res) {
			$scope.connection = res;
		}, function() {
			// cancel clicked
		});
	};

	$scope.open = function(){
		$modal.open({
			templateUrl: 'myModalContent.html',
			controller: ['$scope', '$modalInstance', 'items', function ($scope, $modalInstance, items) {

				$scope.items = items;
				$scope.selected = {
					item: $scope.items[0]
				};

				$scope.ok = function () {
					$modalInstance.close($scope.selected.item);
				};

				$scope.cancel = function () {
					$modalInstance.dismiss('cancel');
				};
			}],
			size: 'sm',
			resolve: {
				items: function () {
					return $scope.items;
				}
			}
		}).result.then(function (selectedItem) {
			$scope.selected = {fruit: selectedItem}
		}, function () {
			console.log('Modal dismissed at: ' + new Date());
		});
	};
}]);
