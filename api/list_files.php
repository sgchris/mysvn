<?php
/**
 * ----- request
 * POST /api/list_files.php
 * {
 * 		url, login, password, 
 * 		revision(number|"HEAD")
 * }
 * ----- response
 * {"result":"ok", "files":[...]}
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

$revision = isset($_POST['revision']) && is_numeric($_POST['revision']) && $_POST['revision'] > 0 ? intval($_POST['revision']) : false;
$filesList = $svn->listFiles($url, $revision);

die(json_encode(array(
	'result' => 'ok',
	'files' => $filesList,
)));
