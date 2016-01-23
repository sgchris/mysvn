MySVN.controller('HomepageController', ['$scope', '$http', '$cookies', '$timeout', '$sce', 'Notification', 
	function($scope, $http, $cookies, $timeout, $sce, Notification) {
	
	$scope.connection = {
		
		// user provided data
		url: '',
		login: '',
		password: '',
		
		// status
		isConnected: false,
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
					$scope.connection.url = storedConnection.url;
					$scope.connection.login = storedConnection.login;
					$scope.connection.password = storedConnection.password;
					
					// connect immediately if credentials supplied
					if ($scope.connection.url && $scope.connection.login && $scope.connection.password) {
						$scope.connection.connect();
					}
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
		connect: function(callbackFn) {
			if ($scope.connection.isConnected) {
				// disconnect
				$scope.connection.lastRevisionNumber = '';
				$scope.connection.baseSvnUrl = '';
				
				$scope.connection.isConnected = false;
				
				// clear the tables
				$scope.commits.deinit();
				$scope.modifiedFiles.deinit();
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
							$scope.commits.commitsTillRevision = res.lastRevisionNumber;
							$scope.connection.baseSvnUrl = res.baseUrl;
							
							$scope.connection.isConnected = true;
							
							// hide the connection box
							$timeout(function() {
								$scope.connection.isOpen = false;
							}, 500);
							
							// load the latest commits once connected
							$scope.commits.loadCommitsList(function() {
								// select the first line
								if ($scope.commits.commitsListGrid.data[0]) {
									$scope.commits.rowClicked($scope.commits.commitsListGrid.data[0]);
								}
							});
							
							if (typeof(callbackFn) == 'function') {
								callbackFn();
							}
						}
					}).finally(function() {
						$scope.connection.isConnecting = false;
					});
				}
			}
		}
	};
	
	// load initial state (from cookies)
	$scope.connection.loadLocallyStoredCredentials();
	
	///////////////////////////////////////////// commits /////////////////////////////////////////////
	
	$scope.commits = {
		commitsLimit: 30,
		commitsTillRevision: 'HEAD',
		
		// for the spinner
		isLoading: false,
		
		// list of modified files per revision
		commitsFiles: {},
		
		// load the list according to the data in the inputs
		loadCommitsList: function(callbackFn) {
			if (!$scope.connection.isConnected) {
				return;
			}
			
			if ($scope.commits.isLoading) {
				return;
			}
			
			$scope.commits.isLoading = true;
			
			// call web API
			$http({
				method: 'POST',
				url: '/api/list_commits.php',
				data: {
					url: $scope.connection.url,
					login: $scope.connection.login,
					password: $scope.connection.password,
					to_revision: $scope.commits.commitsTillRevision,
					limit: $scope.commits.commitsLimit
				}
			}).then(function(res) {
				if (!res || !res.data || !res.data.commits) {
					Notification.error('Error in commits list response');
					return false;
				}
				
				
				if (res.data.result == 'error') {
					Notification.error(res.data.error || 'Error getting list of commits');
					return false;
				}
				
				// res.data.commits[0] looks like: {author: "www-data", date: "2014-08-26T20:22:14.122249Z", msg: "...", paths: Array[4], rev: 1}
				
				// cache modified files per commit
				res.data.commits.forEach(function(cm, i) {
					$scope.commits.commitsFiles[cm.rev] = cm.paths;
					delete res.data.commits[i].paths;
				});
				
				// update the table
				$scope.commits.commitsListGrid.data = res.data.commits;
				
				// callback parameter
				if (typeof(callbackFn) == 'function') {
					callbackFn();
				}
				
			}, function() {
				Notification.error('mysvn server error :(');
			}).finally(function() {
				// stop the spinner
				$scope.commits.isLoading = false;
			});
		},
		
		rowClicked: function(row) {
			// set the selected commit
			$scope.commits.currentCommitRevId = row.rev;
			
			// reset the selected modified file
			$scope.modifiedFiles.currentCommittedFilePath = null;
			
			// update the modified files table
			$scope.modifiedFiles.filesGrid.data = $scope.commits.commitsFiles[row.rev];
		},
		
		currentCommitRevId: null,
		
		commitsListGrid: {
			rowTemplate: '<div ' + 
				'ng-repeat="(colRenderIndex, col) in colContainer.renderedColumns track by col.uid" ' + 
				'class="ui-grid-cell" ' + 
				'ng-class="{ \'ui-grid-row-header-cell\': col.isRowHeader, \'selected-row\': (grid.appScope.commits.currentCommitRevId == row.entity.rev) }" ' + 
				'ui-grid-cell ' + 
				'ng-click="grid.appScope.commits.rowClicked(row.entity)"></div>',
			
			columnDefs: [{
				name: 'rev',
				displayName: '#REV',
				width: '10%'
				//cellTemplate: '<span ng-bind-html="row.entity[col.name] | nameColumnFilter:row.entity"></span>',
			}, {
				name: 'date',
				displayName: 'Date',
				width: '20%',
				cellFilter: 'svnDateFilter'
			}, {
				name: 'author',
				displayName: 'Author',
				width: '20%'
			}, {
				name: 'msg',
				displayName: 'Message',
				width: '50%' 
			}],
			
			data: []
			
		},
		
		deinit: function() {
			$scope.commits.commitsListGrid.data = [];
			$scope.commits.currentCommitRevId = null;
			$scope.commits.commitsTillRevision = 'HEAD';
			
			$scope.commits.commitsFiles = {};
			$scope.commits.commitsLimit = 30;
		}
	};
	
	$scope.modifiedFiles = {
		currentCommittedFilePath: null,
		
		diffString: '',
		
		loadFileDiff: function(filePath, revisionNumber, callbackFn) {
			$scope.modifiedFiles.loadingFileDiff = true;
			
			// call web API
			$http({
				method: 'POST',
				url: '/api/get_diff.php',
				data: {
					url: $scope.connection.baseSvnUrl +  filePath,
					login: $scope.connection.login,
					password: $scope.connection.password,
					
					revision: revisionNumber,
				}
			}).then(function(res) {
				
				if (!res || !res.data || !res.data.result) {
					Notification.error('Error in diff response');
					return false;
				}
				
				if (res && res.data && res.data.result == 'error') {
					Notification.error(res.data.error || 'Error getting the diff');
					return false;
				}
				
				$scope.modifiedFiles.diffString = res.data.diff;
				
				// callback parameter
				if (typeof(callbackFn) == 'function') {
					callbackFn();
				}
				
			}, function() {
				Notification.error('mysvn server error :(');
			}).finally(function() {
				// stop the spinner
				$scope.modifiedFiles.loadingFileDiff = false;
			});
		},
		
		loadingFileDiff: false,
		rowClicked: function(row) {
			// skip, if clicked already selected file
			if (row.path == $scope.modifiedFiles.currentCommittedFilePath) {
				return;
			}
			
			// skip, if loading in progress
			if ($scope.modifiedFiles.loadingFileDiff == true) {
				return;
			}
			
			$scope.modifiedFiles.currentCommittedFilePath = row.path;
			
			// load the diff
			if (row.action.toLowerCase() != 'd') {
				$scope.modifiedFiles.loadFileDiff(row.path, $scope.commits.currentCommitRevId);
			}
		},
		
		// the modified files grid
		filesGrid: {
			rowTemplate: '<div ' + 
				'ng-repeat="(colRenderIndex, col) in colContainer.renderedColumns track by col.uid" ' + 
				'class="ui-grid-cell" ' + 
				'ng-class="{ \'ui-grid-row-header-cell\': col.isRowHeader, \'selected-row\': (grid.appScope.modifiedFiles.currentCommittedFilePath == row.entity.path) }" ' + 
				'ui-grid-cell ' + 
				'ng-click="grid.appScope.modifiedFiles.rowClicked(row.entity)"></div>',
			
			columnDefs: [{
				name: 'action',
				displayName: 'Modified files',
				width: '100%',
				cellTemplate: '<span class="cell-value-wrapper">{{row.entity.action | fullActionName}} <span class="modified-file-path">{{row.entity.path}}</span></span>'
			}],
			
			data: []
		},
		
		deinit: function() {
			$scope.modifiedFiles.filesGrid.data = [];
			$scope.modifiedFiles.currentCommittedFilePath = null;
			
			$scope.modifiedFiles.diffString = '';
		}
		
	}
	
}]);


MySVN.filter('svnDateFilter', function() {
	return function(val) {
		var dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
		var d = new Date(val);
		
	    var dd = d.getDate();
		var mm = d.getMonth()+1; // January is 0!
		var yyyy = d.getFullYear();
		
		var hh = d.getHours();
		var mi = d.getMinutes();
		
		if (dd < 10) { dd = '0' + dd; } 
		if (mm < 10) { mm = '0' + mm; } 
		if (hh < 10) { hh = '0' + hh; } 
		if (mi < 10) { mi = '0' + mi; } 
		
		var d = dd + '.' + mm + '.' + yyyy + ' ' + hh + ':' + mi + ' (' + dow[d.getDay()] + ')';
		return d;
	}
});

MySVN.filter('fullActionName', function() {
	return function(val) {
		var map = {
			'a': 'ADD',
			'm': 'MOD',
			'd': 'DEL'
		}
		
		return map[val.toLowerCase()] || val;
	};
});

// get host name from URL
MySVN.filter('hostNameFromURL', function() {
	return function(val) {
		var res = /https?:\/\/(.*?)\//i.exec(val);
		return res && res[1] ? res[1] : val;
	};
});
