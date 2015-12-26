<?php
/**
 * ----- request
 * POST /api/check_connection.php
 * {host, login, password}
 * ----- response
 * {"result":"ok"}
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

die(json_encode(array(
	'result' => 'ok',
	'ls' => $result,
)));
