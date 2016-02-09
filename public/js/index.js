;$(function () {
  $('#get-info').click( function () {
    var magnet = $('#thash').val()
    var reqURI = '/info/' + encodeURIComponent(magnet)
    $.get({
      'url': reqURI,
      'dataType': 'json',
      'success': function (data) {
        if (typeof data.files === 'object' && data.files.hasOwnProperty('length') && data.files.length > 0) {
          var listEl = $('#files .list')
          data.files.forEach(function (file) {
            listEl.append($('<li>' + file + '</li>'))
          })
        }
      }
    })
  })
})