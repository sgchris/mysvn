
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
	.filter('svnDateFilter', function() {
		return function(val) {
			var d = new Date(val);
			var hours = d.getHours();
			if (hours < 10) hours = '0' + hours;
			var minutes = d.getMinutes();
			if (minutes < 10) minutes = '0' + minutes;
			return d.toDateString() + ' (' + hours + ':' + minutes + ')';
		}
	})
	.filter('svnActionFilter', function() {
		return function(val) {
			var values = {'a': 'Added', 'm': 'Modified', 'r': 'Replaced', 'd': 'Deleted'};
			return values[val.toLowerCase()] || val;
		}
	})
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
webApp.controller('HomepageController', ['$scope', '$modal', '$http', '$timeout', 'Notification', function($scope, $modal, $http, $timeout, Notification) {
	
	// set the default connection
	var SVN_CREDENTIALS = window.SVN_CREDENTIALS || {
		svnurl: '',
		login: '',
		password: ''
	};
	$scope.connection = SVN_CREDENTIALS;
	
	///////////////////////////////////////////////////////////////////////////////////////////
	// commits list
	///////////////////////////////////////////////////////////////////////////////////////////
	
	// store the changed files per commit
	$scope.commitsFiles = {};
	$scope.commitFilesDiff = '';
	$scope.loadingCommitsList = false;
	
	$scope.listCommitsFromRevision = 'initial';
	$scope.listCommitsToRevision = 'head';
	
	// load commits list
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
				
				from_revision: $scope.listCommitsFromRevision,
				to_revision: $scope.listCommitsToRevision,
				limit: 20
			}
		}).then(function(res) {
			$scope.loadingCommitsList = false;
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
			$scope.loadingCommitsList = false;
		});
	};
	
	$scope.getDiffWithPreviousRevision = function(path, revision, callbackFn) {
		
		// path starts from "/trunk" (or branches/tags)
		var endOfBaseUrl,
			baseSvnPath = $scope.connection.svnurl;
		if ((endOfBaseUrl = baseSvnPath.indexOf('/trunk')) >= 0) {
			baseSvnPath = baseSvnPath.substr(0, endOfBaseUrl);
		} else if ((endOfBaseUrl = baseSvnPath.indexOf('/branches')) >= 0) {
			baseSvnPath = baseSvnPath.substr(0, endOfBaseUrl);
		} else if ((endOfBaseUrl = baseSvnPath.indexOf('/branches')) >= 0) {
			baseSvnPath = baseSvnPath.substr(0, endOfBaseUrl);
		} else {
			// assume that baseSvnPath is correct - just trim the last "/" char
			if (baseSvnPath.charAt(baseSvnPath.length - 1) == '/') {
				baseSvnPath = baseSvnPath.substr(0, baseSvnPath.length - 1);
			}
		}
		
		$scope.loadingCommitsList = true;
		$http({
			method: 'POST',
			url: BASE_PATH + 'api/get_diff.php',
			data: {
				svnurl: baseSvnPath + path,
				login: $scope.connection.login,
				password: $scope.connection.password,
				
				revision: revision,
			}
		}).then(function(res) {
			
			if (res.data.result == 'ok') {
				console.log('data ok', res.data.diff);
				$scope.commitFilesDiff = res.data.diff;
			} else {
				Notification.error('Cannot get diff :(');
			}
			
		}, function() {
			Notification.error('Cannot get diff :(');
		}).finally(function() {
			$scope.loadingCommitsList = false;
		});
	};
	
	// update modified files list per commit, on commit row click
	$scope.currentCommitRevId = 'N/A';
	$scope.listCommitsRowClicked = function(row) {
		$scope.currentCommitRevId = row.rev;
		$scope.modifiedFilesGrid.data = $scope.commitsFiles[row.rev];
	};
	
	// list of last commits - grid
	$scope.listCommitsGrid = {
		
		rowTemplate: '<div ' + 
			'ng-repeat="(colRenderIndex, col) in colContainer.renderedColumns track by col.uid" ' + 
			'class="ui-grid-cell" ' + 
			'ng-class="{ \'ui-grid-row-header-cell\': col.isRowHeader, \'selected-commit\': (grid.appScope.currentCommitRevId == row.rev) }" ' + 
			'ui-grid-cell ' + 
			'ng-click="grid.appScope.listCommitsRowClicked(row.entity)"></div>',
		
		columnDefs: [{
			name: 'rev',
			displayName: '#REV',
			width: '10%'
			//cellTemplate: '<span ng-bind-html="row.entity[col.name] | nameColumnFilter:row.entity"></span>',
		}, {
			name: 'msg',
			displayName: 'Message',
			width: '50%' 
			//cellFilter: 'fileSizeFilter'
		}, {
			name: 'author',
			displayName: 'Author',
			width: '20%'
		}, {
			name: 'date',
			displayName: 'Date',
			width: '20%',
			cellFilter: 'svnDateFilter'
		}],
		
		data: []
	};
	
	// list of modified files per commit - grid
	$scope.modifiedFilesGrid = {
		rowTemplate: '<div ' + 
			'ng-repeat="(colRenderIndex, col) in colContainer.renderedColumns track by col.uid" ' + 
			'class="ui-grid-cell" ' + 
			'ng-class="{ \'ui-grid-row-header-cell\': col.isRowHeader, \'selected-commit\': (grid.appScope.currentCommitRevId == row.rev) }" ' + 
			'ui-grid-cell ' + 
			'ng-click="grid.appScope.getDiffWithPreviousRevision(row.entity[\'path\'], grid.appScope.currentCommitRevId)"></div>',
			
		columnDefs: [{
			name: 'action',
			displayName: 'Action',
			width: '20%',
			cellFilter: 'svnActionFilter'
			//cellTemplate: '<span ng-bind-html="row.entity[col.name] | nameColumnFilter:row.entity"></span>',
		}, {
			name: 'path',
			displayName: 'Resource',
			width: '80%' 
		}],
		
		data: []
	};
	
	
	///////////////////////////////////////////////////////////////////////////////////////////
	// files list
	///////////////////////////////////////////////////////////////////////////////////////////
	
	// path relative to the base svn URL
	$scope.relativePath = '';
	
	$scope.loadingFilesList = false;
	
	// load the files list (using relative path)
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
			
			// re-draw the grid
			//angular.element(window).trigger('resize');
		}, function() {
			Notification.error('mysvn server error :(');
		}).finally(function() {
			$scope.loadingFilesList = false;
		});
	};
	
	$scope.connect = function() {
		// connect and list files
		$scope.listFiles('initialLoading = true', function() {
			Notification.success('Connection succeeded :)');
		});
		
		// list commits
		$scope.listCommits(function() {
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
	
		/* created_rev: 0, last_author: "", name: "..", size: -1, time: "", time_t: 0, type: "dir" */
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
		
	
	///////////////////////////////////////////////////////////////////////////////////////////
	// tabs
	///////////////////////////////////////////////////////////////////////////////////////////
	
	$scope.commitsTabIsVisible = true;
	$scope.commitsTabInitiallized = false;
	$scope.filesTabIsVisible = false;
	$scope.filesTabInitialized = false;
	$scope.tabClick = function(tabName) {
		if (tabName == 'commits') {
			$scope.commitsTabIsVisible = true;
			$scope.filesTabIsVisible = false;
			
			if (!$scope.commitsTabInitiallized) {
				$scope.commitsTabInitiallized = true;
				$scope.listCommits();
			}
		}
		
		if (tabName == 'files') {
			$scope.commitsTabIsVisible = false;
			$scope.filesTabIsVisible = true;
			
			if (!$scope.filesTabInitialized) {
				$scope.filesTabInitialized = true;
				var initialLoading = true;
				$scope.listFiles(initialLoading);
			}
		}
		
		// re-draw the grids
		//angular.element(window).trigger('resize');
	};
	$scope.tabClick('commits');
	
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
