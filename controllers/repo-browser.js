MySVN.controller('RepoBrowserController', ['$scope', '$http', function($scope, $http) {
	
	$scope.repoBrowser = {
		path: '/',
		revision: '123'
	}
	
	$scope.filesTree = {
		grid: {
			data: []
		}
	};
	
}]);
