var Q = require('q');
var fs = require('fs');

var helper = {};

helper.getTorrentFiles = function (dir) {
	var deferred = Q.defer();
	Q.nfapply(fs.readdir, [dir]).done(
		function(files) {
			var ret = [];
			var i = 0, f; 
			for (i; i<files.length; ++i){
				f = files[i];
				if (f.length>8) {
					if (f.substring(f.length-8) === '.torrent') {
						ret.push(f.substring(0, f.length-8));
					}
				}
			}
			deferred.resolve(ret);
		}
		);
	return deferred.promise;
};

exports.helper = helper;