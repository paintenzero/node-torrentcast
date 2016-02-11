var files = []
var magnet = null

;$(function () {
  $('#get-info').click( function (e) {
    e.preventDefault()
    magnet = $('#thash').val()
    var reqURI = '/info/' + encodeURIComponent(magnet)
    $.get({
      'url': reqURI,
      'dataType': 'json',
      'success': function (data) {
        if (typeof data.files === 'object' && data.files.hasOwnProperty('length') && data.files.length > 0) {
          files = data.files
          var listEl = $('#files .list')
          files.forEach(function (file, ind) {
            listEl.append($('<li><a href="#" class="torrent-file" data-ind="' + ind + '">' + file + '</a></li>'))
          })
          setFileHandlers()
        }
      }
    })
  })
})

/**
 * @fn setFileHandlers
 * @desc Sets handlers on file links
 * @return none
 */ 
function setFileHandlers () {
  $('#files a.torrent-file').click( function (e) {
    e.preventDefault()
    var ind = parseInt($(this).attr('data-ind'))
    if (ind < files.length) {
      var reqURI = '/playlist/' + encodeURIComponent(magnet) + '/' + ind
      $.get({
        'url': reqURI,
	'dataType': 'json',
	'success': function (data) {
	  if (data.status === 'ok') {
	    if(Hls.isSupported()) {
  	      var video = document.getElementById('video')
	      var hls = new Hls()
	      hls.loadSource(data.playlist_path)
	      hls.attachMedia(video)
	      hls.on(Hls.Events.MANIFEST_PARSED, function () {
	        video.play()
	      })
	    }
	    //$('#video-container').append('<video width="1280" height="720" autoplay="autoplay" src="' + data.playlist_path + '">')
	  }
	}
      })
    }
  })
}
