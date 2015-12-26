<?php
 
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
	die(json_encode(array('result' => 'error', 'error' => 'should be POST request')));
}

if (!array_key_exists('svnurl', $_POST) || !array_key_exists('login', $_POST) || !array_key_exists('password', $_POST)) {
	die(json_encode(array('result' => 'error', 'error' => 'wrong or not enough parameters')));
}

// get the parameters
$host = $_POST['svnurl'];
$login = $_POST['login'];
$password = $_POST['password'];

// @TODO validate parameters

// authentication (from: http://php.net/manual/en/function.svn-auth-set-parameter.php)
svn_auth_set_parameter(SVN_AUTH_PARAM_DEFAULT_USERNAME, $login);
svn_auth_set_parameter(SVN_AUTH_PARAM_DEFAULT_PASSWORD, $password);
svn_auth_set_parameter(PHP_SVN_AUTH_PARAM_IGNORE_SSL_VERIFY_ERRORS, true); // <--- Important for certificate issues! 
svn_auth_set_parameter(SVN_AUTH_PARAM_NON_INTERACTIVE, true); 
svn_auth_set_parameter(SVN_AUTH_PARAM_NO_AUTH_CACHE, true); 

