<?php
/**
 * ----- request
 * POST /api/get_diff.php
 * {
 * 		host, login, password, 
 * 		revision(number)
 * }
 * ----- response
 * {"result":"ok", "diff":[...]}
 * {"result":"error","error":"error info"}
 */

// init the request 
require_once __DIR__ . '/inc/config.php';
// get extra parameters
if (isset($_POST['revision']) && is_numeric($_POST['revision'])) {
	$revision = $_POST['revision'];
} else {
	// get the latest (HEAD) revision number using svn_log
	$fromRevision = SVN_REVISION_INITIAL;
	$toRevision = SVN_REVISION_HEAD;
	$limit = 1;

	// list the commits
	$result = svn_log($host, $fromRevision, $toRevision, $limit);
}

$baseSvnUrl = getSvnBaseUrl($host, $urlPathStartPoint);
$svnPath = substr($host, $urlPathStartPoint);

$revision = intval($revision);
$prevRevision = $revision - 1;
$authentication = '--username=sgchris_yahoo --password=shniWatNeOd3';
$diffShellCommand = "/usr/bin/svn diff {$authentication} --old={$baseSvnUrl}@{$prevRevision} --new={$baseSvnUrl}@{$revision} {$svnPath} 2>&1";
exec($diffShellCommand, $svnDiffOutput);
$svnDiffOutput = $svnDiffOutput ? implode("\n", $svnDiffOutput) : false;

if (empty($svnDiffOutput)) {
	die(json_encode(array(
		'result' => 'error',
		'error' => 'cannot get diff',
	)));
} 

die(json_encode(array(
	'result' => 'ok',
	'diff' => $svnDiffOutput,
)));


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
