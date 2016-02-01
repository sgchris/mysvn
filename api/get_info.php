<?php
/**
 * ----- request
 * POST /api/get_diff.php
 * {
 * 		url, login, password,
 * 		revision(number|"HEAD")
 * }
 * ----- response
 * {"result":"ok", "diff":[...]}
 * {"result":"error","error":"error info"}
 */

// init the request 
require_once __DIR__ . '/inc/config.php';

$svn = new SvnClient($url, $login, $password);
if (($lastError = $svn->getLastError()) != '') {
	die(json_encode(array(
		'result' => 'error',
		'error' => $lastError,
	)));
}

die(json_encode(array(
	'result' => 'ok',
	'baseUrl' => $svn->getSvnBaseUrl(),
	'lastRevisionNumber' => $svn->getLastRevisionNumber(),
)));

