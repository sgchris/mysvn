MySVN.controller('RepoBrowserController', ['$scope', '$http', '$sce', function($scope, $http, $sce) {
	
	$scope.repoBrowser = {
		path: $scope.url,
		revision: $scope.lastRevisionNumber
	}
	
	$scope.filesTree = {
		currentlySelectedNodeUrl: null,
		currentlyOpeningNodeUrl: null,
		
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
			$scope.filesTree.getNodeChildren({
				url: $scope.repoBrowser.path,
				'$$level': 0
			}, $scope.repoBrowser.revision, function(filesList) {
				$scope.filesTree.grid.data = filesList;
			});
		},
		
		filesTreeClick: function(node) {
			
			// if it's a file
			if (node.type == 'file') {
				// load file contents
				$scope.filesTree.currentlySelectedNodeUrl = node.url;
				$scope.fileContent.loadContent(node.url, $scope.repoBrowser.revision);
			} else {
				if (node.$$expanded) {			
					// remove files from the data
					var newData = [];
					$scope.filesTree.grid.data.forEach(function(item, i) {
							
						// mark as not expanded
						if (item.url == node.url && item.name == node.name) {
							$scope.filesTree.grid.data[i].$$expanded = false;
						}	
						
						if (item.$$parent != node.url + node.name) {
							newData.push(item);
						}
					});
					$scope.filesTree.grid.data = newData;
				} else {
					
					// load children of the node
					$scope.filesTree.getNodeChildren(node, $scope.repoBrowser.revision, function(filesList) {
						
						filesList.forEach(function(file, i) {
							filesList[i].$$level = parseInt(node.$$level + 1);
							filesList[i].$$parent = node.url + node.name;
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
		initialContentHtml: '<div class="initial-rb-file-content-state">Select a file in the tree to view its content</div>',
		content: '',
		
		loadContent: function(url, revision, successFn, failureFn, finallyFn) {
			
			$scope.filesTree.currentlyOpeningNodeUrl = url;
			$http({
				method: 'POST',
				url: '/api/get_file_content.php',
				data: {
					url: url,
					login: $scope.login,
					password: $scope.password,
					revision: revision,
				}
			}).then(function(res) {
				if (res && res.data && res.data.result == 'ok') {
					var content = res.data.content;
					$scope.fileContent.content = content;
					
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
			// ..
		}
	};
	
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
