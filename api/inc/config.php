<?php
define('DS', DIRECTORY_SEPARATOR);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
	die(json_encode(array('result' => 'error', 'error' => 'should be POST request')));
}

if (!array_key_exists('url', $_POST) || !array_key_exists('login', $_POST) || !array_key_exists('password', $_POST)) {
	die(json_encode(array('result' => 'error', 'error' => 'wrong or not enough parameters')));
}


// get the parameters
$url = trim($_POST['url']);
$login = trim($_POST['login']);
$password = trim($_POST['password']);

// argument for the command line `svn`
$authenticationArgs = '--username='.$login.' --password='.$password;

// @TODO validate parameters
// ..

require_once __DIR__.DS.'svn.class.php';
