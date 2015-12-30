
// define the filter
webApp
	.filter('nameColumnFilter', ['$sce', function($sce) {
		return function(val, row) {
			var icon = 'list-alt';
			if (row.type == 'dir') {
				icon = 'folder-open';
			}
			return $sce.trustAsHtml('<span style="margin-left: 5px; line-height: 30px;"><i class="glyphicon glyphicon-' + icon + '"></i>&nbsp;&nbsp;' + val + '</span>');
		}
	}])
	.filter('fileSizeFilter', [function() {
		// from: http://stackoverflow.com/questions/10420352/converting-file-size-in-bytes-to-human-readable
		function humanFileSize(bytes) {
			var thresh = 1024;
			if(Math.abs(bytes) < thresh) {
				return bytes + ' B';
			}
			var units = ['KB','MB','GB','TB','PB','EB','ZB','YB'];
			var u = -1;
			do {
				bytes /= thresh;
				++u;
			} while(Math.abs(bytes) >= thresh && u < units.length - 1);
			return bytes.toFixed(1)+' '+units[u];
		}
		
		return function(val, row) {
			return val >= 0 ? humanFileSize(val) : '';
		};
		
	}]);


// define the controller
webApp
	.controller('HomepageController', ['$scope', '$modal', '$http', 'Notification', 
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
				
				// sort by type, and name
				res.data.ls.sort(function(a, b) {
					if (a.type == 'dir' && b.type != 'dir') {
						return -1;
					} else if ((a.type == 'dir' && b.type == 'dir') || (a.type != 'dir' && b.type != 'dir')) {
						if (a.name > b.name) {
							return 1;
						} else if (a.name == b.name) {
							return 0;
						} else {
							return -1;
						}
					} else {
						return 1;
					}
				});
				
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
	
	$scope.loadingFilesList = false;
	$scope.commitsFiles = {};
	$scope.listCommits = function(callbackFn) {
		$scope.loadingCommitsList = true;
		
		// get the URL and the path
		var svnUrl = $scope.connection.svnurl.trim().replace(/\/$/g, '');
		
		$http({
			method: 'POST',
			url: BASE_PATH + 'api/list_commits.php',
			data: {
				svnurl: svnUrl,
				login: $scope.connection.login,
				password: $scope.connection.password,
				
				from_revision: 'initial',
				to_revision: 'head',
				limit: 20
			}
		}).then(function(res) {
			if (res.data.result == 'ok') {
				
				/*
				$$hashKey: "uiGrid-035"
				author: "www-data"
				date: "2014-08-26T20:22:14.122249Z"
				msg: "Automatically created readme.textile and /trunk, /branches, /tags directories. We recommend you to put all your code there."
				paths: Array[4]
				rev: 1
				*/
				
				// cache commits' changed files
				res.data.commits.forEach(function(cm, i) {
					$scope.commitsFiles[cm.rev] = cm.paths;
					delete res.data.commits[i].paths;
				});
				
				$scope.listCommitsGrid.data = res.data.commits;
				
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
	$scope.listCommits();
	
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
	
		/*
		created_rev: 0,
		last_author: "",
		name: "..",
		size: -1,
		time: "",
		time_t: 0,
		type: "dir"
		*/
		columnDefs: [{
			name: 'name',
			displayName: 'Node',
			width: '70%',
			cellTemplate: '<span ng-bind-html="row.entity[col.name] | nameColumnFilter:row.entity"></span>',
		}, {
			name: 'size',
			displayName: 'Size',
			width: '10%',
			cellFilter: 'fileSizeFilter'
		}, {
			name: 'last_author',
			displayName: 'Last Author',
			width: '20%'
		}],
		data: []
	};
	
	$scope.listCommitsGrid = {
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
