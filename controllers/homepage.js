webApp.controller('HomepageController', ['$scope', '$modal', '$http', 'Notification', 
function($scope, $modal, $http, Notification){
	$scope.items = ["Apple", "Orange", "Blueberry"];

	// set the default connection
	$scope.connection = {
		svnurl: 'https://subversion.assembla.com/svn/mysvn-sgchris-1/trunk',
		login: 'sgchris_yahoo',
		password: 'shniWatNeOd3'
	}; 

	$scope.isConnected = false;
	$scope.checkingConnection = false;
	$scope.connect = function() {
		// connect and list files
		$scope.checkingConnection = true;
		$http({
			method: 'POST',
			url: BASE_PATH + 'api/check_connection.php',
			data: {
				svnurl: $scope.connection.svnurl,
				login: $scope.connection.login,
				password: $scope.connection.password,
			}
		}).then(function(res) {
			if (res.data.result == 'ok') {
				Notification.success('Connection succeeded :)');
				console.log('res.data.ls', res.data.ls);
				$scope.listFilesGrid.data = res.data.ls;
			} else {
				Notification.error('Connection failed :(');
			}
		}, function() {
			Notification.error('mysvn server error :(');
		}).finally(function() {
			$scope.checkingConnection = false;
		});
	};
	
	// list files grid
	$scope.listFilesGrid = {
		data: []
	};
	
	/*
	$scope.setCredentials = function() {
		$modal.open({
			templateUrl: 'setCredentials.html',
			resolve: {
				connection: function() {
					return $scope.connection;
				}
			},
			controller: ['$scope', '$modalInstance', 'connection', '$http', 'Notification',
				function($scope, $modalInstance, connection, $http, Notification) {
					// take the data from the main controller
					$scope.svnurl = connection.svnurl;
					$scope.login = connection.login;
					$scope.password = connection.password;
					
					$scope.checkingConnection = false;
					$scope.listFiles = [];

					// define callbacks functions for the buttons
					$scope.setCredentialsOk = function() {
						$scope.checkingConnection = true;
						$http({
							method: 'POST',
							url: BASE_PATH + 'api/check_connection.php',
							data: {
								svnurl: $scope.svnurl,
								login: $scope.login,
								password: $scope.password,
							}
						}).then(function(res) {
							if (res.data.result == 'ok') {
								Notification.success('Connection succeeded');
								$modalInstance.close({
									connection: {
										svnurl: $scope.svnurl,
										login: $scope.login,
										password: $scope.password
									},
									listFiles: res.data.ls
								});
							} else {
								Notification.error('Connection failed');
							}
						}, function() {
							console.error('check connection failure');
						}).finally(function() {
							$scope.checkingConnection = false;
						})
					};
					$scope.setCredentialsCancel = function() {
						$modalInstance.dismiss();
					};
				}
			],
			size: 'sm'
		}).result.then(function(res) {
			$scope.connection = res.connection;
			$scope.listFiles = res.listFiles;
			$scope.isConnected = true;
		}, function() {
			// cancel clicked
		});
	};
	 */

	/*
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
	 */
}]);
