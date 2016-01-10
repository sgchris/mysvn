<?php
/**
 * ----- request
 * POST /api/check_connection.php
 * {
 * 		host, login, password, 
 * 		from_revision(number) (default: initial), 
 * 		to_revision(number) (default: head), 
 * 		limit(number)
 * }
 * ----- response
 * {"result":"ok", "ls":[...]}
 * {"result":"error","error":"error info"}
 */

// init the request 
require_once __DIR__ . '/inc/config.php';

// get extra parameters
$fromRevision = isset($_POST['from_revision']) && is_numeric($_POST['from_revision']) ? $_POST['from_revision'] : 0;
$toRevision = isset($_POST['to_revision']) && is_numeric($_POST['to_revision']) ? $_POST['to_revision'] : 'HEAD';
$limit = isset($_POST['limit']) && is_numeric($_POST['limit']) ? $_POST['limit'] : 20;

// list the commits
$command = "/usr/bin/svn log -v -l {$limit} {$authenticationArgs} {$host} 2>&1";
exec($command, $svnLogOutput);

$commits = svnLogOutputToArray($svnLogOutput);

die(json_encode(array(
	'result' => 'ok',
	'commits' => $commits,
)));

// ====================================================================================

/**
 * @brief convert output from 'svn log -v' to array that looks like:
 * [{
 * 	"rev":101220,
 * 	"author":"oz",
 * 	"msg":"oops - returned gui from the dead",
 * 	"date":"2015-09-17T12:38:18.824119Z",
 * 	"paths":[{
 * 		"action":"A",
 * 		"path":"\/Engine\/ZendServer\/trunk\/gui",
 * 		"copyfrom":"\/Engine\/ZendServer\/trunk\/gui",
 * 		"rev":101217
 * 	}]},
 * 	...
 * 	]
 * 
 * @param array $output 
 * @return array
 */
function svnLogOutputToArray(array $output) {
	$retVal = array();
	
	$commits = getCommitsFromOutput($output);
	foreach ($commits as $rawCommit) {
		$commit = getArrayFromCommitOutput($rawCommit);
		$retVal[] = $commit;
	}
	
	return $retVal;
}

/**
 * @brief separate `svn log -v` output to separate arrays
 * @param array $output 
 * @return  
 */
function getCommitsFromOutput(array $output) {
	$commitsList = array();
	$commitNumber = null;
	foreach ($output as $outputLine) {
		if (strpos($outputLine, '----------') !== false) {
			$commitNumber = is_null($commitNumber) ? 0 : $commitNumber + 1;
		} elseif (is_numeric($commitNumber)) {
			$commitsList[$commitNumber][] = $outputLine;
		}
	}
	
	return $commitsList;
}

/**
 * @brief one commit to structured array
 * @param array $output 
 * @return  
 */
function getArrayFromCommitOutput(array $output) {
	$firstLine = array_shift($output);
	$firstLine = preg_split('%\s*\|\s*%i', $firstLine);
	
	// get base data
	$revision = intval(str_ireplace('r', '', $firstLine[0]));
	$author = $firstLine[1];
	$timeStamp = strtotime(substr($firstLine[2], 0, strpos($firstLine[2], '(')));
	$date = date('d M Y H:i:s', $timeStamp);
	
	// get commit message
	$commitMessage = '';
	while (($msgLine = array_pop($output)) != '') {
		$commitMessage = "{$msgLine} {$commitMessage}";
	}
	$commitMessage = trim($commitMessage);
	
	$retVal = array(
		'rev' => $revision,
		'author' => $author,
		'date' => $date,
		'msg' => $commitMessage,
		'paths' => array(),
	);
	
	// get changed paths list
	if (stripos($output[0], 'changed paths') !== false) {
		array_shift($output);
		
		// gather the modified paths
		foreach ($output as $modifiedResoruceLine) {
			$modifiedResoruceLine = preg_split('%\s+%', trim($modifiedResoruceLine));
			$retVal['paths'][] = array(
				'action' => $modifiedResoruceLine[0],
				'path' => $modifiedResoruceLine[1],
			);
		}
	}
	
	return $retVal;
}
