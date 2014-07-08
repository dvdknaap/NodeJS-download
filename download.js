var download = function download() {

	var fs       = require('fs');
	var url      = require('url');
	var http     = require('http');
	var https    = require('https');
	var request  = require('request');
	var triggers = {
		downloaded: [],
		data: [],
		error: []
	};

	this.downloadFile = function downloadFile(remoteFile, localFile, encoding) {
		var totalDownload = 0;
		var file          = fs.createWriteStream(localFile);
		
		var downloadProtocol = http;
		if (remoteFile.substr(0, 5) === 'https') {
			downloadProtocol = https;
		}

		downloadProtocol.get(remoteFile, function (response) {
	        if (encoding) {
	            response.setEncoding(encoding);
	        }

			var totalLength    = parseInt(response.headers['content-length'], 10);
			var downloaded     = 0;
			var lastPercentage = 0;

			totalDownload  = totalLength / 1048576; //1048576 - bytes in  1Megabyte

			response.pipe(file);
		    response.on('data', function(chunk) {

		        if (response.statusCode !== 200) {
		        	emit('error', { statusCode: response.statusCode, response: chunk.toString() });
		        	return;
		        }

	            downloaded += chunk.length;
		        file.write(chunk);

		        var percentage = (100.0 * downloaded / totalLength).toFixed(2);

		        if (lastPercentage !== percentage) {
		        	var downlaoded = (downloaded / 1048576).toFixed(2);

		        	emit('data', { percentage: percentage, downlaoded: downlaoded, totalSize: totalDownload });

			    	lastPercentage = percentage;
			    }
		    });

		    response.on('end', function() {
		        file.end();

		        if (response.statusCode === 200) {
		        	emit('downloaded', { localFile: localFile, remoteFile: remoteFile, totalSize: totalDownload });
		        } else {
		        	fs.unlink(localFile);
		        }
		    });

			response.on('error', function(e) {
		        emit('error', { statusCode: response.statusCode, response: e.message });
			});
		});
	};

	this.downloadPicture = function downloadFile(remoteFile, localFile, encoding) {
		var file          = fs.createWriteStream(localFile);

		request.head(remoteFile, function(err, res, body) {
    		if (!err && res.statusCode == 200) {

				var r = request(remoteFile).pipe(file);
		        emit('downloaded', { localFile: localFile, remoteFile: remoteFile, totalSize: res.headers['content-length'] });
			} else {
		        emit('error', { statusCode: res.statusCode, res: err });
			}
		});

	};

	var emit = function emit(event, params) {
		if (triggers[event] === undefined ) {
			throw new Error('No valid event');
			return false;
		}

		var totalTriggers = triggers[event].length;

		if (totalTriggers === 0) {
			return false;
		}

		for(var i=0; i<triggers[event].length; ++i) {
			triggers[event][i](params);
		}

		return true;
	};

	this.on = function on(event, userFunction) {
		if (triggers[event] === undefined ) {
			throw new Error('No valid event');
		}

		if (userFunction === undefined || typeof userFunction !== 'function' ) {
			throw new Error('Callback function has to be an function');
		}

		if (event.indexOf(' ') !== -1) {
			var events = event.split(' ');
			for (var e in events) {
				triggers[e].push(userFunction);
			}
		} else {
			triggers[event].push(userFunction);
		}

		return this;
	};

	this.clearTrigger = function clearTrigger(trigger) {
		if (triggers[trigger] !== undefined) {
			delete triggers[trigger];
		}
		return this;
	}

	this.clearTriggers = function clearTriggers() {
		for ( var trigger in triggers) {
			triggers[trigger] = [];
		}
		return this;
	}
};

module.exports = (new download());