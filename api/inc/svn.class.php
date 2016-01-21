<?php

define('SVN_EXECUTABLE', '/usr/bin/svn');

class SvnClient {
	
	protected $logEnabled = true;
	
	// supplied by user
	protected $login;
	protected $password;
	protected $svnUrl;
	
	// filled by the object
	protected $svnBaseUrl = null;
	protected $lastRevisionNumber = null;
	protected $lastError = '';
	
	/**
	 * @param  $svnBaseUrl
	 * @return \SvnClient
	 */
	public function setSvnBaseUrl($svnBaseUrl) {
		$this->svnBaseUrl = $svnBaseUrl;
		return $this;
	}
	
	/**
	 * @return url
	 */
	public function getSvnBaseUrl() {
		return $this->svnBaseUrl;
	}
	
	/**
	 * @param  $lastRevisionNumber
	 * @return \SvnClient
	 */
	public function setLastRevisionNumber($lastRevisionNumber) {
		$this->lastRevisionNumber = $lastRevisionNumber;
		return $this;
	}
	
	/**
	 * @return int
	 */
	public function getLastRevisionNumber() {
		return $this->lastRevisionNumber;
	}
	
	/**
	 * @param  $lastError
	 * @return \SvnClient
	 */
	protected function setLastError($lastError) {
		$this->lastError = $lastError;
		return $this;
	}
	
	/**
	 * @return string
	 */
	public function getLastError() {
		return $this->lastError;
	}
	
	/**
	 * @brief 
	 * @param string $svnUrl 
	 * @param string $login 
	 * @param string $password 
	 * @return 
	 */
	public function __construct($svnUrl, $login, $password) {
		$this->svnUrl = $svnUrl;
		$this->login = $login;
		$this->password = $password;
		
		// get svn info
		if (false === $this->_getSvnInfo()) {
			$this->setLastError('Cannot get SVN info');
		}
	}
	
	/**
	 * @brief Get the svn log (commits list with modified resources)
	 * @param <unknown> $path 
	 * @param <unknown> $fromRevision 
	 * @param <unknown> $toRevision 
	 * @param <unknown> $limit 
	 * @return array
	 */
	public function log($path = null, $toRevision = 'HEAD', $limit = 30) {
		if (false === $this->_getSvnInfo()) {
			$this->setLastError('Cannot get SVN info');
			return false;
		}
		
		// check the path. If not given, take the base SVN URL
		if (is_null($path)) {
			$path = $this->svnBaseUrl;
		}
		
		// check the 'toRevision' param. if not given, take the last commit
		if (strcasecmp($toRevision, 'head') == 0 || !is_numeric($toRevision) || intval($toRevision) <= 0) {
			$toRevision = $this->lastRevisionNumber;
		}
		
		// prepare and execute the command
		$command = SVN_EXECUTABLE.' log -v '.$this->_getAuthArguments().' -l '.$limit.' '.$this->svnUrl;
		$result = $this->_exec($command);
		if ($result === false) {
			return false;
		}
		
		// transform to PHP readable format
		$result = $this->_svnLogOutputToArray($result);
		return $result;
	}
	
	/**
	 * @brief diff two resources
	 * @param string $path1 
	 * @param int $revision1 - number or "HEAD"
	 * @param int $revision2 - number or "HEAD"
	 * @return string 
	 */
	public function diff($path1, $revision1, $revision2) {
		
		if (false === $this->_getSvnInfo()) {
			$this->setLastError('Cannot get SVN info');
			return false;
		}
		
		// check the revisions parameter
		if (strcasecmp($revision1, 'head') == 0) {
			$revision1 = $this->lastRevisionNumber;
		}
		if (strcasecmp($revision2, 'head') == 0) {
			$revision2 = $this->lastRevisionNumber;
		}
		
		// validate the revisions
		if (!is_numeric($revision1) || !is_numeric($path2)) {
			return false;
		}
		
		// fix the paths
		$path1 = $this->_mergeStrings($this->svnBaseUrl, $path1);
		$path1 = str_replace($this->svnBaseUrl, '', $path1);
		
		// prepare and execute the command
		$command = SVN_EXECUTABLE.' diff '.$this->_getAuthArguments().
			' --old '.escapeshellarg($this->svnBaseUrl).'@'.$revision1 .
			' --new '.escapeshellarg($this->svnBaseUrl).'@'.$revision2 .
			' '.$path1;
		
		$result = $this->_exec($command);
		return $result;
	}
	
	// PROTECTED ///////////////////////////////////////////////////////////////////////////////////////////////////
	
	/**
	 * @brief get authentication arguments
	 * @return  
	 */
	protected function _getAuthArguments() {
		return '--username '.escapeshellarg($this->login).' --password '.escapeshellarg($this->password);
	}
	
	/**
	 * @brief Get basic SVN information
	 * @return  
	 */
	protected function _getSvnInfo() {
		// check if already loaded
		if (!is_null($this->svnBaseUrl) && !is_null($this->lastRevisionNumber)) {
			return;
		}
		
		// get SVN info
		$command = SVN_EXECUTABLE.' info '.($this->_getAuthArguments()).' '.$this->svnUrl;
		$result = $this->_exec($command);
		
		// parse the result
		foreach ($result as $row) {
			if (($colonPos = strpos($row, ':')) === false) continue;
			
			$svnInfoKey = strtolower(trim(substr($row, 0, $colonPos)));
			$svnInfoValue = strtolower(trim(substr($row, $colonPos + 1)));
			
			if ($svnInfoKey == 'revision') {
				$this->_log("setting last revision number to {$svnInfoValue}");
				$this->lastRevisionNumber = $svnInfoValue;
			} elseif ($svnInfoKey == 'repository root') {
				$this->_log("setting svnBaseUrl to {$svnInfoValue}");
				$this->svnBaseUrl = $svnInfoValue;
			}
		}
		
		if (is_null($this->svnBaseUrl)) {
			return false;
		}
		
		return true;
	}
	
	/**
	 * @brief execute commands with output redirect
	 * @param string $command 
	 * @param bool $asArray 
	 * @return array|string 
	 */
	protected function _exec($command, $asArray = true) {
		$this->_log("executing: {$command}");
		
		exec($command.' 2>&1', $output);
		return $asArray ? $output : implode("\n", $output);
	}
	
	/**
	 * @brief Merge strings with common part - str1 ending and str2 beginning
	 * @param string $str1 
	 * @param string $str2 
	 * @return string
	 */
	protected function _mergeStrings($str1, $str2) {
		for ($i=1; $i < strlen($str1); $i++) {
			if (strcasecmp(substr($str1, -1 * $i, $i), substr($str2, 0, $i)) == 0) {
				return substr($str1, 0, -1 * $i) . $str2;
			}
		}

		return $str1 . $str2;
	}
	
	
	
	/**
	 * @brief convert output from 'svn log -v' to array that looks like:
	 * [{
	 * 	"rev":101220,
	 * 	"author":"oz",
	 * 	"msg":"oops - returned gui from the dead",
	 * 	"date":"2015-09-17T12:38:18.824119Z",
	 * 	"paths":[{
	 * 		"action":"A",
	 * 		"path":"\/Engine\/ZendServer\/trunk\/gui",
	 * 		"copyfrom":"\/Engine\/ZendServer\/trunk\/gui",
	 * 		"rev":101217
	 * 	}]},
	 * 	...
	 * 	]
	 * 
	 * @param array $output 
	 * @return array
	 */
	protected function _svnLogOutputToArray(array $output) {
		$retVal = array();
		
		$commits = $this->_getCommitsFromOutput($output);
		foreach ($commits as $rawCommit) {
			$commit = $this->_getArrayFromCommitOutput($rawCommit);
			$retVal[] = $commit;
		}
		
		return $retVal;
	}

	/**
	 * @brief separate `svn log -v` output to separate arrays
	 * @param array $output 
	 * @return  
	 */
	protected function _getCommitsFromOutput(array $output) {
		$commitsList = array();
		$commitNumber = null;
		foreach ($output as $outputLine) {
			if (strpos($outputLine, '----------') !== false) {
				$commitNumber = is_null($commitNumber) ? 0 : $commitNumber + 1;
			} elseif (is_numeric($commitNumber)) {
				$commitsList[$commitNumber][] = $outputLine;
			}
		}
		
		return $commitsList;
	}

	/**
	 * @brief one commit to structured array
	 * @param array $output 
	 * @return  
	 */
	protected function _getArrayFromCommitOutput(array $output) {
		$firstLine = array_shift($output);
		$firstLine = preg_split('%\s*\|\s*%i', $firstLine);
		
		// get base data
		$revision = intval(str_ireplace('r', '', $firstLine[0]));
		$author = $firstLine[1];
		$timeStamp = strtotime(substr($firstLine[2], 0, strpos($firstLine[2], '(')));
		$date = date('d M Y H:i:s', $timeStamp);
		
		// get commit message
		$commitMessage = '';
		while (($msgLine = array_pop($output)) != '') {
			$commitMessage = "{$msgLine} {$commitMessage}";
		}
		$commitMessage = trim($commitMessage);
		
		$retVal = array(
			'rev' => $revision,
			'author' => $author,
			'date' => $date,
			'msg' => $commitMessage,
			'paths' => array(),
		);
		
		// get changed paths list
		if (stripos($output[0], 'changed paths') !== false) {
			array_shift($output);
			
			// gather the modified paths
			foreach ($output as $modifiedResoruceLine) {
				if (empty($modifiedResoruceLine)) {
					continue;
				}
				
				$modifiedResoruceLine = preg_split('%\s+%', trim($modifiedResoruceLine));
				if (count($modifiedResoruceLine) != 2) {
					continue;
				}
				
				$retVal['paths'][] = array(
					'action' => $modifiedResoruceLine[0],
					'path' => $modifiedResoruceLine[1],
				);
			}
		}
		
		return $retVal;
	}
	
	/**
	 * @brief add message to the log file. 
	 * @param string $str 
	 * @return  
	 */
	protected function _log($str) {
		if (!$this->logEnabled) {
			return;
		}
		
		$logFile = __FILE__.'.log';
		@file_put_contents($logFile, date('d.m.Y H:i:s').": {$str}\n", FILE_APPEND);
	}
	
}






