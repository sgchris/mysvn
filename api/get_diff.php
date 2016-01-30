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

$revision1 = isset($_POST['revision']) && is_numeric($_POST['revision']) && $_POST['revision'] > 0 ? intval($_POST['revision']) : $svn->getLastRevisionNumber();
$revision2 = $revision1 - 1;

$diff = $svn->diff($url, $revision2, $revision1);
if ($diff === false) {
	die(json_encode(array(
		'result' => 'error',
		'error' => $svn->getLastError(),
	)));
}

die(json_encode(array(
	'result' => 'ok',
	'diff' => implode("\n", $diff),
)));
