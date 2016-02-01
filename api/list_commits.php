<?php
/**
 * ----- request
 * POST /api/check_connection.php
 * {
 * 		url, login, password,
 * 		to_revision(number|"HEAD"), 
 * 		limit(number) (default: 30)
 * }
 * ----- response
 * {"result":"ok", "commits":[...]}
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

$toRevision = isset($_POST['to_revision']) && is_numeric($_POST['to_revision']) && $_POST['to_revision'] > 0 ? intval($_POST['to_revision']) : 'HEAD';
$limit = isset($_POST['limit']) && is_numeric($_POST['limit']) && $_POST['limit'] > 0 ? intval($_POST['limit']) : 30;

$commitsList = $svn->log($url, $toRevision, $limit);

die(json_encode(array(
	'result' => 'ok',
	'commits' => $commitsList,
)));
