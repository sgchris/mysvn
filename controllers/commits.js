MySVN.controller('CommitsController', ['$scope', '$state', '$http', '$cookies', '$timeout', '$sce', 'Notification', 
	function($scope, $state, $http, $cookies, $timeout, $sce, Notification) {
	
	$scope.commits = {
		commitsLimit: 30,
		commitsTillRevision: 'HEAD',
		
		// for the spinner
		isLoading: false,
		
		// list of modified files per revision
		commitsFiles: {},
		
		// load the list according to the data in the inputs
		loadCommitsList: function(callbackFn) {
			if (!$scope.isConnected) {
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
					url: $scope.url,
					login: $scope.login,
					password: $scope.password,
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

		creatingPatch: false,
		createPatch: function() {
			if (!$scope.commits.currentCommitRevId) {
				return;
			}

			$scope.commits.creatingPatch = true;
			$http({
				method: 'POST',
				url: '/api/get_diff.php',
				data: {
					url: $scope.baseSvnUrl,
					login: $scope.login,
					password: $scope.password,
					
					revision: $scope.commits.currentCommitRevId,
				}
			}).then(function(res) {
				if (res && res.data && res.data.result == 'ok') {
					var dataUrl = 'data:text/plain;base64,' + btoa(res.data.diff);
					var link = document.createElement('a');
					link.download = 'patch_' + $scope.commits.currentCommitRevId + '.patch';
					link.href = dataUrl;
					link.click();
					//window.open(dataUrl);
				}
			}).finally(function() {
				$scope.commits.creatingPatch = false;
			});
		},
		
		commitsListGrid: {
			rowTemplate: '<div ' + 
				'ng-repeat="(colRenderIndex, col) in colContainer.renderedColumns track by col.uid" ' + 
				'class="ui-grid-cell" ' + 
				'ng-class="{ ' + 
					'\'ui-grid-row-header-cell\': col.isRowHeader, ' + 
					'\'selected-row\': (grid.appScope.commits.currentCommitRevId == row.entity.rev) ' + 
				'}" ' + 
				'ui-grid-cell ' + 
				'ng-click="grid.appScope.commits.rowClicked(row.entity)"></div>' + 
				'<div class="ui-grid-cell-second-row" ng-click="grid.appScope.commits.rowClicked(row.entity)" ' + 
					'ng-class="{ \'selected-row\': grid.appScope.commits.currentCommitRevId == row.entity.rev}" ' + 
					'title="{{row.entity.msg}}">' + 
					'Message: <strong>{{row.entity.msg}}</strong>' + 
				'</div>',
			
			columnDefs: [{
				name: 'rev',
				displayName: '#REV',
				width: '20%'
				//cellTemplate: '<span ng-bind-html="row.entity[col.name] | nameColumnFilter:row.entity"></span>',
			}, {
				name: 'date',
				displayName: 'Date',
				width: '30%',
				cellFilter: 'svnDateFilter'
			}, {
				name: 'author',
				displayName: 'Author',
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
					url: $scope.baseSvnUrl +  filePath,
					login: $scope.login,
					password: $scope.password,
					
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
				cellTemplate: '<span class="cell-value-wrapper" title="{{row.entity.path}}">{{row.entity.action | fullActionName}} <span class="modified-file-path">{{row.entity.path}}</span></span>'
			}],
			
			data: []
		},
		
		deinit: function() {
			$scope.modifiedFiles.filesGrid.data = [];
			$scope.modifiedFiles.currentCommittedFilePath = null;
			
			$scope.modifiedFiles.diffString = '';
		}
		
	}
	
	$scope.$watch('isConnected', function(isConnected) {
		if (!isConnected) {
			// disconnected
			$scope.commits.deinit();
			$scope.modifiedFiles.deinit();
		} else {
			// connected
			// load the latest commits once connected
			$scope.commits.loadCommitsList(function() {
				
				$scope.commits.commitsTillRevision = $scope.lastRevisionNumber;
				
				// select the first line
				if ($scope.commits.commitsListGrid.data[0]) {
					$scope.commits.rowClicked($scope.commits.commitsListGrid.data[0]);
				}
			});
		}
	});
	
	// handle window resize and curtains
	$scope.commitsListPanelWidth = '1px';
	$scope.modifiedFilesPanelWidth = '1px';
	$scope.fixWidths = function() {
		$scope.commitsListPanelWidth = document.getElementById('commits-list-grid').clientWidth + 'px';
		$scope.modifiedFilesPanelWidth = document.getElementById('modified-file-content').clientWidth + 'px';
	}
	window.addEventListener('resize', function() {
		$scope.$apply(function() {
			$scope.fixWidths();
		});
	});
	$scope.fixWidths();
	
}]);

MySVN.filter('nowrap', function() {
	return function(rawStr) {
		rawStr = rawStr.replace(/[\n\r]/g, '');
		return rawStr;
	};
});

MySVN.filter('htmlentities', function() {
	return function(rawStr) {
		// replace UTF characters
		rawStr = rawStr.replace(/[\u00A0-\u9999<>\&]/gim, function(i) {
		   return '&#'+i.charCodeAt(0)+';';
		});
		
		// replace all html characters
		rawStr = rawStr.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
		
		return rawStr;
	};
});

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
		
		var d = dd + '.' + mm + '.' + yyyy + ' ' + hh + ':' + mi;
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
MySVN.filter('repoBrowserFileFilter', ['$sce', function($sce) {
	return function(val, rec) {
		var treeLevel = rec.$$treeLevel || 0;
		var indentationPrefix = '<i class="fa fa-chevron-right"></i> '.repeat(treeLevel);
		
		var chevronPrefix = (rec.type == 'folder') ? 
			'<i class="fa fa-chevron-right"></i>' : 
			'<i class="fa fa-chevron-right" style="visibility: hidden;"></i>';
		
		return $sce.trustAsHtml(indentationPrefix + chevronPrefix + val);
	}
}]);
