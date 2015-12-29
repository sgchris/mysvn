webApp.controller('HomepageController', ['$scope', '$modal', '$http', 'Notification', 
function($scope, $modal, $http, Notification){
	$scope.items = ["Apple", "Orange", "Blueberry"];

	// set the default connection
	$scope.connection = {
		svnurl: 'https://subversion.assembla.com/svn/mysvn-sgchris-1/trunk',
		login: 'sgchris_yahoo',
		password: 'shniWatNeOd3'
	}; 

	// set the default connection
	/*
	$scope.connection = {
		svnurl: 'https://il-cms1.zend.net/svn/Zend/Engine/ZendServer/trunk/gui',
		login: 'gregory.c',
		password: 'YT65yt65'
	};
	 */ 

	$scope.relativePath = '';
	$scope.isConnected = false;
	$scope.checkingConnection = false;
	$scope.loadingFilesList = false;
	
	$scope.listFiles = function(initial, callbackFn) {
		$scope.loadingFilesList = true;
		
		if (initial) {
			$scope.relativePath = '/';
		}
		
		// get the URL and the path
		var svnUrl = $scope.connection.svnurl.trim().replace(/\/$/g, '');
		var relativePath = $scope.relativePath.trim().replace(/^\//g, '').replace(/\/$/g, '');
		// add the relative path
		svnUrl+= '/' + relativePath;
		$http({
			method: 'POST',
			url: BASE_PATH + 'api/list_files.php',
			data: {
				svnurl: svnUrl,
				login: $scope.connection.login,
				password: $scope.connection.password,
			}
		}).then(function(res) {
			if (res.data.result == 'ok') {
				if ($scope.relativePath != '/') {
					res.data.ls.splice(0, 0, {
						created_rev: 0,
						last_author: "",
						name: "..",
						size: -1,
						time: "",
						time_t: 0,
						type: "dir"
					});
				}
				
				$scope.listFilesGrid.data = res.data.ls;
				
				if (typeof(callbackFn) == 'function') {
					callbackFn();
				}
			} else {
				Notification.error('Cannot files files :(');
			}
		}, function() {
			Notification.error('mysvn server error :(');
		}).finally(function() {
			$scope.checkingConnection = false;
			$scope.loadingFilesList = false;
		});
	};
	$scope.listFiles(true);
	
	$scope.connect = function() {
		// connect and list files
		$scope.checkingConnection = true;
		$scope.listFiles('initialLoading = true', function() {
			Notification.success('Connection succeeded :)');
		});
	};
	
	$scope.listFilesRowClicked = function(row) {
		
		if (row.name == '..') {
			$scope.relativePath = $scope.relativePath.substr(0, $scope.relativePath.lastIndexOf('/'));
			if ($scope.relativePath == '') $scope.relativePath = '/';
		} else {
			$scope.relativePath = $scope.relativePath.replace(/\/$/g, '') + '/' + row.name;
		}
		$scope.listFiles();
	};
	
	// list files grid
	$scope.listFilesGrid = {
		rowTemplate: '<div ' + 
				'ng-repeat="(colRenderIndex, col) in colContainer.renderedColumns track by col.uid" ' + 
				'class="ui-grid-cell" ' + 
				'ng-class="{ \'ui-grid-row-header-cell\': col.isRowHeader, \'files-list-row-hover\': filesListIsHover }" ui-grid-cell ' + 
				'ng-mouseenter="filesListIsHover = true" ng-mouseleave="filesListIsHover = false" ng-init="filesListIsHover=false" '+
				'ng-dblclick="grid.appScope.listFilesRowClicked(row.entity)"></div>',
		data: []
	};

	/*
	// open modal example
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
