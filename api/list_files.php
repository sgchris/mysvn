<?php
/**
 * ----- request
 * POST /api/check_connection.php
 * {host, login, password}
 * ----- response
 * {"result":"ok", "ls":[...]}
 * {"result":"error","error":"error info"}
 */

// init the request 
require_once __DIR__ . '/inc/config.php';

// list folders and files
$result = svn_ls($host);
if ($result === false) {
	die(json_encode(array(
		'result' => 'error',
		'error' => 'cannot read list',
	)));
}

// transform the result to an array
$retVal = array();
foreach ($result as $fileName => $fileInfo) {
	$retVal[] = array_merge(array('name' => $fileName), $fileInfo);
}

die(json_encode(array(
	'result' => 'ok',
	'ls' => $retVal,
)));
