<?php

define('SVN_EXECUTABLE', '/usr/bin/svn');

require(__DIR__.DS.'Simple-PHP-Cache'.DS.'cache.class.php');

class SvnClient {
	
	protected $logEnabled = true;
	protected $cacheEnabled = true;
	protected $dynamicDataCacheTTL = 180;
	
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
	
	/* @var Cache */
	protected $_cacheObject = null;
	
	/**
	 * @brief get cache object
	 * @return Cache
	 */
	protected function _getCacheObject() {
		if (is_null($this->_cacheObject)) {
			$this->_cacheObject = new Cache;
			
			// clear all expired keys
			$this->_cacheObject->eraseExpired();
		}
		
		return $this->_cacheObject;
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
			$path = $this->getSvnBaseUrl();
		}
		
		// check the 'toRevision' param. if not given, take the last commit
		if (strcasecmp($toRevision, 'head') == 0 || !is_numeric($toRevision) || intval($toRevision) <= 0) {
			$toRevision = $this->getLastRevisionNumber();
		}
		
		$cacheKey = 'log_'.rawurlencode($path .'_'. $toRevision .'_'. $limit);
		
		if (!$this->cacheEnabled || null === ($result = $this->_getCacheObject()->retrieve($cacheKey))) {
			// prepare and execute the command
			$command = SVN_EXECUTABLE.' log -v '.$this->_getAuthArguments().' -l '.$limit.' '.$path.'@'.$toRevision;
			$result = $this->_exec($command);
			if ($result === false) {
				$this->setLastError('cannot execute command');
				return false;
			}
			
			$this->_getCacheObject()->store($cacheKey, $result, $this->dynamicDataCacheTTL); // store the info for `dynamicDataCacheTTL` time
		}
		
		// transform to PHP readable format
		$result = $this->_svnLogOutputToArray($result);
		
		return $result;
	}
	
	/**
	 * @brief 
	 * @param string $path 
	 * @param number $revision 
	 * @return  
	 */
	public function listFiles($svnUrl, $revision = null) {
		if (false === $this->_getSvnInfo()) {
			$this->setLastError('Cannot get SVN info');
			return false;
		}
		
		if (is_null($revision)) {
			$revision = $this->getLastRevisionNumber();
		}
		
		$this->svnUrl = $svnUrl;
		$cacheKey = 'list_'.rawurlencode($svnUrl.'_'.$revision);
		
		if (!$this->cacheEnabled || null === ($result = $this->_getCacheObject()->retrieve($cacheKey))) {
			// prepare and execute the command
			$command = SVN_EXECUTABLE.' list -v '.$this->_getAuthArguments().' '.$svnUrl.'@'.$revision;
			$result = $this->_exec($command);
			if ($result === false) {
				$this->setLastError('cannot execute command');
				return false;
			}
			
			$this->_getCacheObject()->store($cacheKey, $result);
		}
		
		// transform to PHP readable format
		$result = $this->_svnListToArray($result);
		
		return $result;
	}
	
	/**
	 * @brief get the content of a file in a revision
	 * @param string $path 
	 * @param number $revision 
	 * @return  
	 */
	public function getFileContent($svnUrl, $revision = null) {
		if (false === $this->_getSvnInfo()) {
			$this->setLastError('Cannot get SVN info');
			return false;
		}
		
		if (is_null($revision)) {
			$revision = $this->getLastRevisionNumber();
		}
		
		$this->svnUrl = $svnUrl;
		$cacheKey = 'file_content_'.rawurlencode($svnUrl.'_'.$revision);
		
		if (!$this->cacheEnabled || null === ($result = $this->_getCacheObject()->retrieve($cacheKey))) {
			// prepare and execute the command
			$command = SVN_EXECUTABLE.' cat '.$this->_getAuthArguments().' '.$svnUrl.'@'.$revision;
			$result = $this->_exec($command);
			if ($result === false) {
				$this->setLastError('cannot execute command');
				return false;
			}
			
			$this->_getCacheObject()->store($cacheKey, $result);
		}
		
		$result = implode("\n", $result);
		
		return $result;
	}
	
	/**
	 * @brief get the changes of the file per line (SVN blame)
	 * @param string $path 
	 * @param number $revision 
	 * @return  
	 */
	public function getFileBlame($svnUrl, $revision = null) {
		if (false === $this->_getSvnInfo()) {
			$this->setLastError('Cannot get SVN info');
			return false;
		}
		
		if (is_null($revision)) {
			$revision = $this->getLastRevisionNumber();
		}
		
		$this->svnUrl = $svnUrl;
		$cacheKey = 'file_blame_'.rawurlencode($svnUrl.'_'.$revision);
		$result = '';
		
		if (!$this->cacheEnabled || null === ($result = $this->_getCacheObject()->retrieve($cacheKey))) {
			// prepare and execute the command
			$command = SVN_EXECUTABLE.' blame -v '.$this->_getAuthArguments().' '.$svnUrl.'@'.$revision;
			$result = $this->_exec($command, $__asArray = false);
			if ($result === false) {
				$this->setLastError('cannot execute command');
				return false;
			}

			// prettify the result
			$prettifyResult = $this->_prettifyBlameResult($result);

			// if the result was successful, store in the cache
			if ($prettifyResult) {
				$this->_getCacheObject()->store($cacheKey, $result);
			}
		}
		
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
		if (!is_numeric($revision1) || !is_numeric($revision2)) {
			$this->setLastError('revision number error');
			return false;
		}
		
		// fix the paths
		$path1 = $this->_mergeStrings($this->getSvnBaseUrl(), $path1);
		$path1 = str_replace($this->getSvnBaseUrl(), '', $path1);
		
		// check if the result was cached
		$cacheKey = 'diff_'.rawurlencode($path1 .'_'. $revision1 .'_'. $revision2);
		if (!$this->cacheEnabled || null === ($result = $this->_getCacheObject()->retrieve($cacheKey))) {
			// prepare and execute the command
			$command = SVN_EXECUTABLE.' diff '.$this->_getAuthArguments().
				' --old '.escapeshellarg($this->getSvnBaseUrl()).'@'.$revision1 .
				' --new '.escapeshellarg($this->getSvnBaseUrl()).'@'.$revision2 .
				' '.$path1;
			
			$result = $this->_exec($command);
			
			$this->_getCacheObject()->store($cacheKey, $result);
		}
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
		if (!is_null($this->getSvnBaseUrl()) && !is_null($this->getLastRevisionNumber())) {
			return;
		}
		
		// get SVN info. check if it's cached first
		$cacheKey = 'svninfo_'.rawurlencode($this->svnUrl);
		if (!$this->cacheEnabled || null === ($result = $this->_getCacheObject()->retrieve($cacheKey))) {
			$command = SVN_EXECUTABLE.' info '.($this->_getAuthArguments()).' '.$this->svnUrl;
			$result = $this->_exec($command);
			
			$this->_getCacheObject()->store($cacheKey, $result, $this->dynamicDataCacheTTL); // store the info for `dynamicDataCacheTTL` time
		}
		
		// parse the result
		foreach ($result as $row) {
			if (($colonPos = strpos($row, ':')) === false) continue;
			
			$svnInfoKey = trim(substr($row, 0, $colonPos));
			$svnInfoValue = trim(substr($row, $colonPos + 1));
			
			if ($svnInfoKey == 'Revision') {
				$this->_log("setting last revision number to {$svnInfoValue}");
				$this->setLastRevisionNumber($svnInfoValue);
			} elseif ($svnInfoKey == 'Repository Root') {
				$this->_log("setting svnBaseUrl to {$svnInfoValue}");
				$this->setSvnBaseUrl($svnInfoValue);
			}
		}
		
		if (is_null($this->getSvnBaseUrl())) {
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
		
		// log the operation
		$this->_log("Executing \"{$command}\"");
		
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
	 * Remove the "pretty date" and the timezone from every line of `svn blame` output
	 */
	protected function _prettifyBlameResult(&$rawLines) {
		// remove the pretty date and the timezone from every line
		$rawLines = preg_replace('%\s+[\+\-]+\d+?\s+\(.*?\)%', '', $rawLines, $__limit = -1, $totalChanged);
		return ($totalChanged && $totalChanged > 0);
	}

	/**
	 * Parse the `svn blame` output
	 */
	protected function _parseSvnBlame($rawLines) {

		// remove whitespaces
		array_walk($rawLines, function(&$elem) {
			$elem = trim($elem);
		});

		$parsedArr = array();
		if (!empty($rawLines)) foreach ($rawLines as $line) {
			$res = preg_match('%'. 
				'\s*(?<revision>\d+)\s+'. // revision
				'(?<author>.*?)\s+'. // author
				'(?<rawdate>.*?)\s+\('. // date time timezone (e.g. "2016-04-24 14:02:01 +0200")
				'(?<prettydate>.*?)\)\s*'. // pretty date (e.g. "Mon, 27 Jul 2015")
				'(?<codeline>.*?)$'. // the code line
				'%i', $line, $matches);

			if ($res) {
				$parsedArr[] = array(
					'revision' => $matches['revision'],
					'author' => $matches['author'],
					'date' => $matches['date'],
					'line' => $matches['codeline'],
				);
			}
		}

		return $parsedArr;
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
	 * @brief parse `svn list` output and store it in an array
	 * @param array $result 
	 * @return array
	 */
	protected function _svnListToArray($result) {
		$filesList = array();
		if (!empty($result)) {
			foreach ($result as $i => $line) {
				// check if this is a file or a folder
				if (preg_match('%(\d+?)\s+(\w{3})\s+(\d+?)\s+\d{2}\:\d{2}\s+(.*?)$%i', $line, $matches)) {
					$fileName = trim($matches[4]);
					$fileSize = intval($matches[1]);
					$filesList[] = array(
						'url' => trim($this->svnUrl, '/') . '/' . $fileName,
						'type' => 'file',
						'name' => $fileName,
						'size' => $fileSize,
					);
				} elseif (preg_match('%\s+(\w{3})\s+(\d+?)\s+\d{2}\:\d{2}\s+(.*?)$%i', $line, $matches)) {
					$folderName = trim(trim($matches[3]), '/');
					if (empty($folderName) || $folderName == '.') {
						continue;
					}
					
					$filesList[] = array(
						'url' => trim($this->svnUrl, '/') . '/' . $folderName,
						'type' => 'folder',
						'name' => $folderName,
					);
				}
			}
		}
		
		// sort by type, name (asc)
		usort($filesList, function($a, $b) {
			// first folders, than files
			if ($a['type'] == 'folder' && $b['type'] == 'file') {
				return -1;
			}
			if ($a['type'] == 'file' && $b['type'] == 'folder') {
				return 1;
			}
			
			// same type, compare by name
			return strcasecmp($a['name'], $b['name']);
		});
		
		return $filesList;
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
		if (file_exists($logFile)) {
			if (!is_writeable($logFile)) {
				return;
			}
		} else {
			if (!is_writeable(dirname($logFile))) {
				return false;
			}
		}
		
		@file_put_contents($logFile, date('d.m.Y H:i:s').": {$str}\n", FILE_APPEND);
	}
	
}
