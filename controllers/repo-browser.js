MySVN.controller('RepoBrowserController', ['$scope', '$http', function($scope, $http) {
	
	$scope.repoBrowser = {
		path: $scope.url,
		revision: $scope.lastRevisionNumber
	}
	
	$scope.filesTree = {
		
		getNodeChildren: function(node, revision, successFn, failureFn, finallyFn) {
			successFn = successFn || function(){};
			failureFn = failureFn || function(){};
			finallyFn = finallyFn || function(){};
			
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
			}, failureFn).finally(finallyFn);
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
			if (node.type != 'folder') {
				return;
			}
			
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
					console.log('filesList', filesList);
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
		},
		
		grid: {
			rowTemplate: '<div ' + 
				'ng-repeat="(colRenderIndex, col) in colContainer.renderedColumns track by col.uid" ' + 
				'class="ui-grid-cell" ' + 
				'ng-class="{ \'ui-grid-row-header-cell\': col.isRowHeader }" ' + 
				'ui-grid-cell ' + 
				'ng-click="grid.appScope.filesTree.filesTreeClick(row.entity)"></div>',
				
			columnDefs: [{
				name: 'name',
				displayName: 'Files',
				width: '100%',
				cellTemplate: '<span class="cell-value-wrapper" ng-bind-html="row.entity[col.name] | filesListColumnFilter:row.entity"></span>',
			}],
			
			data: []
		}
	};
	
	$scope.filesTree.init();
	
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
		var cellHtml = indentation + icon + ' ' + val;
		
		return $sce.trustAsHtml(cellHtml);
	};
}])
