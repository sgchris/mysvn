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
$fromRevision = isset($_POST['from_revision']) && is_numeric($_POST['from_revision']) ? $_POST['from_revision'] : SVN_REVISION_INITIAL;
$toRevision = isset($_POST['to_revision']) && is_numeric($_POST['to_revision']) ? $_POST['to_revision'] : SVN_REVISION_HEAD;
$limit = isset($_POST['limit']) && is_numeric($_POST['limit']) ? $_POST['limit'] : 20;

// list the commits
$result = svn_log($host, $fromRevision, $toRevision, $limit);
if ($result === false) {
	die(json_encode(array(
		'result' => 'error',
		'error' => 'cannot read list',
	)));
}

die(json_encode(array(
	'result' => 'ok',
	'commits' => $result,
)));
