MySVN.controller('RepoBrowserController', ['$scope', '$http', '$sce', function($scope, $http, $sce) {
	
	$scope.repoBrowser = {
		path: $scope.url,
		revision: $scope.lastRevisionNumber
	}
	
	$scope.filesTree = {
		currentlySelectedNodeUrl: null,
		currentlyOpeningNodeUrl: null,
		loadingTheTree: false,
		
		getNodeChildren: function(node, revision, successFn, failureFn, finallyFn) {
			successFn = successFn || function(){};
			failureFn = failureFn || function(){};
			finallyFn = finallyFn || function(){};
			
			$scope.filesTree.currentlyOpeningNodeUrl = node.url;
			
			$http({
				method: 'POST',
				url: '/api/list_files.php',
				data: {
					url: node.url,
					login: $scope.login,
					password: $scope.password,
					revision: revision,
				}
			}).then(function(res) {
				if (res && res.data && res.data.result == 'ok') {
					var files = res.data.files;
					
					files.forEach(function(file, i) {
						files[i].$$level = node.$$level + 1;
					});
					
					// mark node as expanded!
					$scope.filesTree.grid.data.forEach(function(item, i) {
						if (item.url == node.url && item.name == node.name) {
							$scope.filesTree.grid.data[i].$$expanded = true;
						}
					});
					
					if (typeof(successFn) == 'function') {
						successFn(res.data.files);
					}
				} else {
					failureFn();
				}
			}, failureFn).finally(function() {
				$scope.filesTree.currentlyOpeningNodeUrl = null;
				finallyFn();
			});
		},
		
		init: function() {
			$scope.filesTree.loadingTheTree = true;

			$scope.filesTree.getNodeChildren({
				url: $scope.repoBrowser.path,
				'$$level': 0
			}, $scope.repoBrowser.revision, function(filesList) {
				$scope.filesTree.grid.data = filesList;
			}, null, function() {
				$scope.filesTree.loadingTheTree = false;
			});
		},

		_getUrlsToRemove: function(node) {

			var removeUrls = [];
			$scope.filesTree.grid.data.forEach(function(item, i) {
				if (item.$$parent == node.url) {
					// add the item itself
					removeUrls.push(item.url);

					// add all the children of this item
					removeUrls = removeUrls.concat($scope.filesTree._getUrlsToRemove(item));
				} 
			});

			return removeUrls;
		},

		_closeNode: function(node) {
			var urlsToRemove = $scope.filesTree._getUrlsToRemove(node);
			if (urlsToRemove.length > 0) {
				// remove nodes from the data
				var newData = [];
				$scope.filesTree.grid.data.forEach(function(item, i) {

					if (item.url == node.url) {
						$scope.filesTree.grid.data[i].$$expanded = false;
					}
					
					// mark as not expanded
					if (urlsToRemove.indexOf(item.url) < 0) {
						newData.push(item);
					}	
				});

				$scope.filesTree.grid.data = newData;
			}
		},

		filesTreeClick: function(node) {
			// if it's a file
			if (node.type == 'file') {
				
				// mark the relevant flags
				$scope.filesTree.currentlySelectedNodeUrl = node.url;
				$scope.revisions.currentlySelectedRevision = null;
				
				// mark the "content" tab
				$scope.fileContent.setTab('content');
				
				// load contents and revisions
				$scope.fileContent.loadContent();
				$scope.revisions.loadRevisions(function(res) {
					// select the first item
					if (res && res.length > 0) {
						$scope.revisions.currentlySelectedRevision = res[0].rev;
					}
				});
			} else {
				if (node.$$expanded) {			
					$scope.filesTree._closeNode(node);
				} else {
					
					// load children of the node
					$scope.filesTree.getNodeChildren(node, $scope.repoBrowser.revision, function(filesList) {
						
						filesList.forEach(function(file, i) {
							filesList[i].$$level = parseInt(node.$$level + 1);
							filesList[i].$$parent = node.url;
						});
						
						// add the files to the data
						var newData = [];
						$scope.filesTree.grid.data.forEach(function(item, i) {
							newData.push(item);
							if (item.url == node.url && item.name == node.name) {
								filesList.forEach(function(newFileItem) {
									newData.push(newFileItem);
								});
							}
						});
						
						$scope.filesTree.grid.data = newData;
					}, function() {
						Notification.error('Cannot load the folder')
					});
					
				}
			}
		},
		
		grid: {
			rowTemplate: '<div ' + 
				'ng-repeat="(colRenderIndex, col) in colContainer.renderedColumns track by col.uid" ' + 
				'class="ui-grid-cell" ' + 
				'ng-class="{ ' + 
					'\'ui-grid-row-header-cell\': col.isRowHeader, ' + 
					'\'repo-browser-opening-node\': grid.appScope.filesTree.currentlyOpeningNodeUrl == row.entity.url, ' + 
					'\'selected-row\': grid.appScope.filesTree.currentlySelectedNodeUrl == row.entity.url ' + 
				'}" ' + 
				'ui-grid-cell ' + 
				'ng-click="grid.appScope.filesTree.filesTreeClick(row.entity)"></div>',
				
			columnDefs: [{
				name: 'name',
				displayName: 'Files',
				width: '80%',
				cellTemplate: '<span class="cell-value-wrapper" ng-bind-html="row.entity[col.name] | filesListColumnFilter:row.entity"></span>',
			}, {
				name: 'size',
				displayName: 'Size',
				sortable: false,
				width: '20%',
				cellFilter: 'sizesBeautifier'
			}],
			
			data: []
		}
	};
	
	$scope.filesTree.init();
	
	$scope.fileContent = {
		isContentDisplayed: true,
		contentLoading: false,
		isDiffDisplayed: false,
		diffLoading: false,
		
		setTab: function(selectedTab) {
			if (selectedTab == 'content') {
				$scope.fileContent.isContentDisplayed = true;
				$scope.fileContent.isDiffDisplayed = false;
				
				// load the content
				$scope.fileContent.loadContent($scope.filesTree.currentlySelectedNodeUrl, $scope.revisions.currentlySelectedRevision);
			} else if (selectedTab == 'diff') {
				$scope.fileContent.isContentDisplayed = false;
				$scope.fileContent.isDiffDisplayed = true;
				
				// load the diff
				$scope.fileContent.loadDiff($scope.filesTree.currentlySelectedNodeUrl, $scope.revisions.currentlySelectedRevision);
			}
		},
		
		content: '',
		
		loadContent: function(successFn, failureFn, finallyFn) {
			
			$scope.filesTree.currentlyOpeningNodeUrl = $scope.filesTree.currentlySelectedNodeUrl;
			
			$scope.fileContent.contentLoading = true;
			$http({
				method: 'POST',
				url: '/api/get_file_content.php',
				data: {
					url: $scope.filesTree.currentlySelectedNodeUrl,
					login: $scope.login,
					password: $scope.password,
					revision: $scope.revisions.currentlySelectedRevision,
				}
			}).then(function(res) {
				if (res && res.data && res.data.result == 'ok') {
					var content = res.data.content;
					$scope.fileContent.content = content;
					
					if (typeof(successFn) == 'function') {
						successFn(res.data.files);
					}
				} else {
					if (typeof(failureFn) == 'function') {
						failureFn();
					}
				}
			}, failureFn).finally(function() {
				$scope.filesTree.currentlyOpeningNodeUrl = null;
				$scope.fileContent.contentLoading = false;
				
				if (typeof(finallyFn) == 'function') {
					finallyFn();
				}
			});
		},
		
		loadDiff: function(successFn, failureFn, finallyFn) {
			$scope.fileContent.diffLoading = true;
			$http({
				method: 'POST',
				url: '/api/get_diff.php',
				data: {
					url: $scope.filesTree.currentlySelectedNodeUrl,
					login: $scope.login,
					password: $scope.password,
					revision: $scope.revisions.currentlySelectedRevision,
				}
			}).then(function(res) {
				if (res && res.data && res.data.result == 'ok') {
					var content = res.data.diff;
					$scope.fileContent.content = content;
					
					if (typeof(successFn) == 'function') {
						successFn(res.data.diff);
					}
				} else {
					if (typeof(failureFn) == 'function') {
						failureFn();
					}
				}
			}, failureFn).finally(function() {
				$scope.fileContent.diffLoading = false;
				if (typeof(finallyFn) == 'function') {
					finallyFn();
				}
			});
		},
		
		init: function() {
			// ..
		}
	};
	
	
	$scope.revisions = {
		currentlyOpeningRevision: null,
		currentlySelectedRevision: null,
		loadingRevisions: false,
		
		revisionClick: function(revNode) {
			$scope.revisions.currentlySelectedRevision = revNode.rev;
			
			$scope.fileContent.setTab('content');
			
			// load file content from revision
			$scope.fileContent.loadContent();
		},
		
		loadRevisions: function(callbackFn, failureFn, finallyFn) {
			$scope.revisions.loadingRevisions = true;
			
			// call web API
			$http({
				method: 'POST',
				url: '/api/list_commits.php',
				data: {
					url: $scope.filesTree.currentlySelectedNodeUrl,
					login: $scope.login,
					password: $scope.password,
					limit: 200
				}
			}).then(function(res) {
				if (!res || !res.data || !res.data.commits) {
					Notification.error('Error in commits list response');
					if (typeof(failureFn) == 'function') {
						failureFn();
					}
					return false;
				}
				
				$scope.revisions.grid.data = res.data.commits;
				
				if (typeof(callbackFn) == 'function') {
					callbackFn(res.data.commits);
				}
			}, function() {
				Notification.error('mysvn server error :(');
				if (typeof(failureFn) == 'function') {
					failureFn();
				}
			}).finally(function() {
				$scope.revisions.loadingRevisions = false;
				
				if (typeof(finallyFn) == 'function') {
					finallyFn();
				}
			});
		},
		
		grid: {
			rowTemplate: '<div ' + 
				'ng-repeat="(colRenderIndex, col) in colContainer.renderedColumns track by col.uid" ' + 
				'class="ui-grid-cell" ' + 
				'ng-class="{ ' + 
					'\'ui-grid-row-header-cell\': col.isRowHeader, ' + 
					'\'repo-browser-opening-node\': grid.appScope.revisions.currentlyOpeningRevision == row.entity.rev, ' + 
					'\'selected-row\': grid.appScope.revisions.currentlySelectedRevision == row.entity.rev ' + 
				'}" ' + 
				'ui-grid-cell ' + 
				'ng-click="grid.appScope.revisions.revisionClick(row.entity)"></div>' + 
				'<div class="ui-grid-cell-second-row" ng-click="grid.appScope.revisions.revisionClick(row.entity)" ' + 
					'ng-class="{ \'selected-row\': grid.appScope.revisions.currentlySelectedRevision == row.entity.rev}">' + 
					'Message: <strong>{{row.entity.msg}}</strong>' + 
				'</div>',
				
			columnDefs: [{
				name: 'rev',
				displayName: '#REV',
				width: '20%'
			}, {
				name: 'date',
				displayName: 'Date',
				width: '40%',
				cellFilter: 'svnDateFilter'
			}, {
				name: 'author',
				displayName: 'Author',
				width: '40%'
			}, 
			/*
			{
				name: 'msg',
				displayName: 'Message',
				width: '50%',
				cellTemplate: '<span class="cell-value-wrapper" title="{{row.entity[col.name] | htmlentities}}">{{row.entity[col.name] | nowrap }}</span>'
			}
			*/
			],
			
			data: []
		}
	}
	
	$scope.fileContent.init();
	
}]);

MySVN.filter('filesListColumnFilter', ['$sce', function($sce) {
	return function(val, rec) {
		var icon;
		if (rec.type == 'folder') {
			if (rec.$$expanded) {
				icon = '<i class="fa fa-folder-open"></i>';
			} else{
				icon = '<i class="fa fa-folder"></i>';
			}
		} else {
			icon = '<i class="fa fa-file-o"></i>';
		}
		
		var indentation = '<i class="fa fa-file" style="visibility: hidden"></i>'.repeat(rec.$$level * 2);
		
		var spinner = '<i class="fa fa-spinner fa-spin repo-browser-open-tree-node-spinner"></i>';
		
		var cellHtml = indentation + icon + ' ' + val + ' ' + spinner;
		
		return $sce.trustAsHtml(cellHtml);
	};
}]);

MySVN.filter('sizesBeautifier', [function() {
	return function(bytes) {
		if (bytes != parseInt(bytes)) {
			return '';
		}
		var oneKilo = 1024;
		var oneMega = 1024 * 1024;
		var oneGiga = 1024 * 1024 * 1024;
		var oneTera = 1024 * 1024 * 1024 * 1024;
		if (isNaN(parseFloat(bytes)) || !isFinite(bytes) || bytes === 0) return '0';
		var units = {
				1: 'KB',
				2: 'MB',
				3: 'GB',
				4: 'TB'
			},
			measure, floor, precision;
		if (bytes > oneTera) {
			measure = 4;
		} else if (bytes > oneGiga && bytes <= oneTera) {
			measure = 3;
		} else if (bytes > oneMega && bytes <= oneGiga) {
			measure = 2;
		} else if (bytes <= oneMega) {
			measure = 1;
		}
		floor = Math.floor(bytes / Math.pow(oneKilo, measure)).toString().length;
		if (floor > 3) {
			precision = 0;
		} else {
			precision = 3 - floor;
		}
		return (bytes / Math.pow(oneKilo, measure)).toFixed(precision) + units[measure];
	};
}]);
