<?php
/**
 * ----- request
 * POST /api/list_files.php
 * {
 * 		url, login, password, 
 * 		revision(number|"HEAD")
 * }
 * ----- response
 * {"result":"ok", "content": ""}
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
$svn->eraseExpired();

$revision = isset($_POST['revision']) && is_numeric($_POST['revision']) && $_POST['revision'] > 0 ? intval($_POST['revision']) : false;
$fileContent = $svn->getFileContent($url, $revision);

die(json_encode(array(
	'result' => 'ok',
	'content' => $fileContent,
)));
