webApp.controller('HomepageController', ['$scope', '$modal', function($scope, $modal){
	$scope.items = ["Apple", "Orange", "Blueberry"];

	// set the default credentials
	$scope.credentials = {
		hostname: 'greg',
		login: '',
		password: ''
	}; 
	
	$scope.setCredentials = function() {
		$modal.open({
			templateUrl: 'setCredentials.html',
			resolve: {
				credentials: function() {
					return $scope.credentials;
				}
			},
			controller: ['$scope', '$modalInstance', 'credentials', 
				function($scope, $modalInstance, credentials) {
					// take the data from the main controller
					$scope.hostname = credentials.hostname;
					$scope.login = credentials.login;
					$scope.password = credentials.password;

					// define callbacks functions for the buttons
					$scope.setCredentialsOk = function() {
						$modalInstance.close({
							hostname: $scope.hostname,
							login: $scope.login,
							password: $scope.password 
						});
					};
					$scope.setCredentialsCancel = function() {
						$modalInstance.dismiss();
					};
				}
			],
			size: 'sm'
		}).result.then(function(res) {
			$scope.credentials = res;
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
