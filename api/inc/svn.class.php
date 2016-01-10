<?php

define('SVN_EXECUTABLE', '/usr/bin/svn');

class SvnClient {
	
	// supplied by user
	protected $login;
	protected $password;
	protected $svnUrl;
	
	// filled by the object
	protected $svnBaseUrl = null;
	protected $lastRevisionNumber = null;
	protected $lastError = '';
	
	/**
	 * @brief 
	 * @return  
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
		$result = $this->_getSvnInfo();
		if ($result === false) {
			$this->lastError = 'Cannot get SVN info';
		}
	}
	
	/**
	 * @brief Get the svn log (commits list with modified resources)
	 * @param <unknown> $path 
	 * @param <unknown> $fromRevision 
	 * @param <unknown> $toRevision 
	 * @param <unknown> $limit 
	 * @return  
	 */
	public function log($path = null, $fromRevision = 0, $toRevision = 'HEAD', $limit = 20) {
		if ($result === false) {
			return false;
		}
		
		// check the path. If not given, take the base SVN URL
		if (is_null($path)) {
			$path = $this->svnBaseUrl;
		}
		
		// if no start revision given, take the last 20 commits
		if ($fromRevision == 0) {
			$fromRevision = intval($this->lastRevisionNumber) - 20;
			if ($fromRevision < 0) {
				$fromRevision = 0;
			}
		}
		
		// check the 'toRevision' param. if not given, take the last commit
		if ($toRevision == 0) {
			$toRevision = $this->lastRevisionNumber;
		}
		
		// prepare and execute the command
		$command = SVN_EXECUTABLE.' log -v '.$this->_getAuthArguments().' -l '.$limit.' '.$this->svnUrl;
		$result = $this->_exec($command);
		
		// transform to PHP readable format
		$result = $this->_svnLogOutputToArray($result);
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
			$rowExpl = explode(':', $row);
			$svnInfoKey = strtolower(trim($rowExpl[0]));
			$svnInfoValue = strtolower(trim($rowExpl[1]));
			
			if ($svnInfoKey == 'revision') {
				$this->lastRevisionNumber = $svnInfoValue;
			} elseif ($svnInfoKey == 'repository root') {
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
		exec($command.' 2>&1', $output);
		return $asArray ? $output : implode("\n", $output);
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
				$modifiedResoruceLine = preg_split('%\s+%', trim($modifiedResoruceLine));
				$retVal['paths'][] = array(
					'action' => $modifiedResoruceLine[0],
					'path' => $modifiedResoruceLine[1],
				);
			}
		}
		
		return $retVal;
	}

	
	
}





