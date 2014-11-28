var xmlhttp = new XMLHttpRequest();
var baseurl = "https://api.jamendo.com/v3.0/";
var client_id = '795e43fd';
var data;
var playlist = {};
var song;
var currentTrack = 0;
var currentRadio = 0;
// For localizing strings in JavaScript
var _ = navigator.mozL10n.get;
function convertTime(secs){
	// convert milisecons to minutes and secons
	var minutes = parseInt( secs / 60 ) % 60;
	var seconds = parseInt(secs % 60);
	((minutes < 10) ? minutes = "0"+minutes: '');
	((seconds < 10) ? seconds = "0"+seconds: '');
	return "{0}:{1}".format(minutes, seconds);

}

if (!String.prototype.format) {
	// for format strings
	String.prototype.format = function() {
		var args = arguments;
		return this.replace(/{(\d+)}/g, function(match, number) {
			return typeof args[number] != 'undefined'
			? args[number]
			: match
			;
		});
	};
}

function getData(params, cb){
	// get data from Jamendo API
	xmlhttp.onreadystatechange = function() {
		if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
			if( typeof cb === 'function' )
                cb(JSON.parse(xmlhttp.responseText));
		}
	}
	xmlhttp.onerror = function() {
		utils.status.show(_('data_error'));
	}
	if (params.search(/\?/) == -1){
		params += '?client_id='+client_id;
	}else{
		params += '&client_id='+client_id;
	}

	url = baseurl+params;
	xmlhttp.open("GET", url, true);
	xmlhttp.send();
}

function changeDIV(div){
	// hidde all the divs except the especific
	divs = ['radios', 'news', 'artist-info', 'listen', 'jamendo-top', 'search'];
	for (i=0; i < divs.length; i++){
		if (div == divs[i]){
			$('#'+div).show();
		}else{
			$('#'+divs[i]).hide();
		}
	}
}

function startPlay(){
	if (song){
		song.pause();
	}
	song = new Audio()
	song.setAttribute('src', playlist[currentTrack].audio);
	song.setAttribute('preload', 'auto');
	song.setAttribute('mozaudiochannel', 'content');
	song.load();
	$('#track-name').text(playlist[currentTrack].track_name);
	$('#artist').text(playlist[currentTrack].artist_name);
	$('#album-art').attr('src', playlist[currentTrack].image);
	if (playlist[currentTrack].album_name){
		$('#album').text(playlist[currentTrack].album_name);
	}
	if (playlist[currentTrack].download){
		$('#download').attr('href', playlist[currentTrack].download);
	}

	song.play();
	$('#play i').removeClass('fa-play')
	$('#play i').addClass('fa-pause');
	var seekbar = document.getElementById('seekbar');
	seekbar.addEventListener("change", function(){
		song.currentTime = seekbar.value;
	});
	seekbar.max = song.duration;
	song.addEventListener('timeupdate',function (){
		var curtime = parseInt(song.currentTime, 10);
		seekbar.value = curtime;
		seekbar.max = song.duration;
		$('#current-time').text(convertTime(curtime));
		$('#total-time').text(convertTime(song.duration));
	});
	song.addEventListener('ended',function (){
		if (currentTrack = Object.keys(playlist).length - 1){
			song.pause()
			seekbar.value = 0;
			currentTrack = 0;
			$('#current-time').text('00:00');
			$('#play i').removeClass('fa-pause')
			$('#play i').addClass('fa-play');
		}else{
			seekbar.value = 0;
			nextTrack();
		}
	});
	song.addEventListener("error", function(e){
		utils.status.show(_('stream_error'));
		return false;
	});
}

function getAlbum(id){
	// get album
	getData('albums/tracks?audioformat=ogg&id='+id, function(responseText) {
		data = responseText.results[0];
		playlist = {};
		for (i=0; i<data.tracks.length; i++){
			track_name = data.tracks[i].name;
			audio = data.tracks[i].audio;
			download  = data.tracks[i].audiodownload;
			playlist[i] = {"artist_name": data.artist_name, "album_name": data.name, "track_name": track_name, "image": data.image, "audio": audio, "download": download};
		}
		$('#controls').show();
		startPlay();
	});
}
function getPlaylist(id){
	// get playlist
	getData('playlists/tracks?audioformat=ogg&id='+id, function(responseText) {
		playlist = {};
		data = responseText.results[0];
		for (i=0; i<data.tracks.length; i++){
			track_name = data.tracks[i].name;
			audio = data.tracks[i].audio;
			playlist[i] = {"artist_name": data.tracks[i].artist_name, "track_name": track_name, "image": data.tracks[i].album_image, "audio": audio, "download": data.tracks[i].audiodonwload};
		}
		$('#controls').show();
		startPlay();
	});
}
function getArtistTrackst(id){

	// get all artist tracks
	getData('artists/tracks?audioformat=ogg&imagesize=100&id='+id, function(responseText) {
		data = responseText.results[0];
		playlist = {};
		for (i=0; i<data.tracks.length; i++){
			track_name = data.tracks[i].name;
			audio = data.tracks[i].audio;
			playlist[i] = {"artist_name": data.name, "track_name": track_name, "image": data.tracks[i].album_image, "audio": audio, "album_name": data.tracks[i].album_name, 'download': data.tracks[i].audiodownload};
		}
		$('#controls').show();
		startPlay();
	});
}
function getRadioStream(id){
	// get Radio Stream
	changeDIV('listen');
	if (currentRadio != id){
		currentRadio = id;
		getData('radios/stream?id='+id, function(responseText) {
			playlist = {};
			data = responseText.results[0];
			playlist[0] = {"artist_name": data.playingnow.artist_name, "track_name": data.playingnow.track_name, "image": data.playingnow.track_image, "audio": data.stream, "album_name": data.playingnow.album_name};
			if (song){
				song.pause();
			}
			// set interval for get the next track info
			$('#controls').hide();
			if (startPlay()){
				setInterval(function () {getRadioStream(id)}, parseInt(data.callmeback));
			}else{
				return false
			}
		});
	}else{
		getData('radios/stream?id='+id, function(responseText) {
			data = responseText.results[0];
			$('#track-name').text(data.playingnow.track_name);
			$('#artist').text(data.playingnow.artist_name);
			$('#album-art').attr('src', data.playingnow.track_image);
			$('#album').text(data.playingnow.album_name);
			setInterval(function () {getRadioStream(id)}, parseInt(data.callmeback));
		});
	}
}
function getTrack(id){
	getData('artists/tracks?audioformat=ogg&imagesize=100&track_id='+id, function(responseText) {
		data = responseText.results[0].tracks[0];
		playlist = {};
		playlist[0] = {"artist_name": data.name, "track_name": data.track_name, "image": data.album_image, "audio": data.audio, "album_name": data.album_name, 'download': data.audiodownload};
		$('#controls').show();
		startPlay();
	});

}
function getTop(top){
	params = top+'/?order=popularity_week';
	if (top == 'tracks'){
		params +='&audiodlformat=ogg'
	}
	getData(params, function(responseText) {
		data = responseText.results;
		$('#top-list ul').empty();
		for (i=0; i < data.length; i++){
			if (top == 'albums'){
				$('#top-list ul').append('<li><aside><img src="{0}"></aside><a href="#" id="{1}" data-type="album"><p>{2}</p><p>{3}</p></a></li>'.format(data[i].image, data[i].id, data[i].name, data[i].artist_name));
			}else if (top == 'artists'){
				$('#top-list ul').append('<li><aside><img src="{0}"></aside><a href="#" id="{1}" data-type="artist"><p>{2}</p></a></li>'.format(data[i].image, data[i].id, data[i].name));
			}else{
				playlist[i] = {"artist_name": data[i].artist_name, "track_name": data[i].name, "image": data[i].album_image, "audio": data[i].audio, "album_name": data[i].album_name, 'download': data[i].audiodownload};
				$('#top-list ul').append('<li><aside><img src="{0}"></aside><a href="#" data-type="tracks" data-track="{1}"><p>{2}</p><p>{3}</p></a></li>'.format(data[i].album_image, i, data[i].name, data[i].artist_name));
			}
		}
	});
}
function nextTrack(){
	// change to next track
	if(currentTrack >= 0 && currentTrack < Object.keys(playlist).length - 1){
		currentTrack += 1;
		song.pause();
		startPlay();
	}
}

function getNews(){
	getData('feeds/', function(responseText) {
    // News
		if (navigator.mozL10n.language.code == 'es'){
			lang = 'es';
		}else if (navigator.mozL10n.language.code == 'it'){
			lang = 'it';
		}else{
			lang = 'en';
		}
		data = responseText.results;
		for (i=0; i<data.length; i++){
			text = '';
			if (data[i].text[lang]){
				text = data[i].text[lang];
			}else{
				text = data[i].text.en;
			}

			if (data[i].type == "album"){
				html = '<article class="col-1-2"> \
					<div class="hero">\
						<a id="{0}" data-type="album"><img src="{1}"></a>\
						<div class="text">{2}</div>\
					</div>\
					<p class="title">{3}</p>\
					{4}"\
				</article>'.format(data[i].joinid, data[i].images.size315_111, data[i].title[lang], data[i].subtitle[lang], text);
			}else{
				type = _(data[i].type);
				html = '<article class="col-1-2"> \
					<div class="hero">\
						<a id="{0}" data-type={1}><img src="{2}"></a>\
						<div class="text">{3}</div>\
					</div>\
					<p class="title">{4}</p>\
					{5}"\
				</article>'.format(data[i].joinid, data[i].type, data[i].images.size315_111, data[i].title[lang], type, text);
			}
			$('#news').append(html);
		}
	});
}

function getArtistData(id){
	getData('artists/?id='+id, function(responseText) {
		$('#artist_name').text(responseText.results[0].name);
		joindate = new Date(responseText.results[0].joindate);
		$('#artist_joindate').text(joindate.toLocaleDateString(lang));
		if (responseText.results[0].website){
			$('#artist_website').attr('href', responseText.results[0].website);
		}else{
			$('#artist_website').attr('href', '#');
		}
		$('#artist_cover').attr('src', responseText.results[0].image);
	});
	getArtistTrackst(id);
}
$("#search-btn").click(function(e) {
	e.preventDefault();
	search = $('#search-input').val();
	searchby = $('#search-by').val();
	orderby = $('#order-by').val();
	limit = $('#limit option:selected').text();
	params = '{0}/?namesearch={1}&order={2}&limit={3}'.format(searchby, search, orderby, limit);
	if (search){
		getData(params, function(responseText) {
			$('#search-results').empty();
			data = responseText.results;
			console.log(responseText);
			$.each( data, function( key, value ) {
				image = ''
				if (value.image == '' || value.album_image == ''){
					image = 'img/no-image.png';
				}else if (value.image){
					image = value.image;
				}else{
					image = value.album_image;
				}
				console.log(value);
				$('#search-results').append('<li><aside><img src="{0}"/></aside><a href="#" data-id={1} data-type={2}><p>{3}</p></a></li>'.format(image, value.id, searchby, value.name));
			});
		});
	}
});

document.addEventListener('DOMContentLoaded', function(){
	changeDIV('artist-info');
	getNews();
	$("#news").delegate('.hero a', 'click', function() {
		id = $(this).attr('id');
		type = $(this).attr('data-type');
		if (song){
			song.pause();
		}
		if (type == 'album'){
			getAlbum(id);
		}else if (type == 'playlist'){
			getPlaylist(id);
		}else{
			getArtistTrackst(id);
		}
		changeDIV('listen');
	});
	$("#radios-list").delegate('li a', 'click', function() {
		id = $(this).attr('id');
		getRadioStream(id);
		$('#now-listen').toggleClass('current');
		$('#radios').toggleClass('right');
	});
	$('#top-list ul').delegate('li a', 'click', function(){
		type = $(this).attr('data-type');
		changeDIV('listen');
		if (type == 'album'){
			getAlbum($(this).attr('id'));
		}else if (type == 'artist'){
			getArtistTrackst($(this).attr('id'));
		}else{
			currentTrack = parseInt($(this).attr('data-track'));
			startPlay();
		}
	});

	$('#search-results').delegate('li a', 'click', function(){
		id = $(this).attr('data-id');
		type = $(this).attr('data-type');
		if (type == 'album'){
			getAlbum(id);
		}else if (type == 'tracks'){
			getTrack(id);
		}else{
			getArtistData(id);
		}
		changeDIV('artist-info');
	});

	// need for translate the app
	var _ = navigator.mozL10n.get;
	navigator.mozL10n.once(start);
	function start() {
		lang = navigator.mozL10n.language.code;
		if (lang.search(/es-*/) != -1){
			// Need for translate to all Spanish variants (es-ES, es-AR, es-MX, etc)
			navigator.mozL10n.language.code = 'es';
		}
	}
});

$('#btn-now-listen').click(function () {
	changeDIV('listen');
});

$('#btn-radios').click( function () {
	changeDIV('radios');
	getData('radios/', function(responseText) {
		// radios
		data = responseText.results;
		for (i=0; i < data.length; i++){
			$('#radios-list').append('<li><aside><img src="{0}"></aside><a href="#" id="{1}"><p>{2}</p></a></li>'.format(data[i].image, data[i].id, data[i].dispname));
		}
	});
});


$('#btn-info').click( function () {
	changeDIV('jamendo-top');
});

$('#btn-news').click( function () {
	changeDIV('news');
	getNews()
});
$('#btn-search').click( function () {
	changeDIV('search');
});
$('#play').click( function () {
	if (song.paused){
		song.play();
		$('#play i').removeClass('fa-play')
		$('#play i').addClass('fa-pause');
	}else{
		song.pause();
		$('#play i').removeClass('fa-pause')
		$('#play i').addClass('fa-play');
	}
});

$('#next').click( function () {
	if (song){
		nextTrack();
	}
});

$('#stop').click( function () {
	if (song){
		if (song.paused){
			$('#play i').removeClass('fa-pause')
			$('#play i').addClass('fa-play');
		}
		song.pause();
		seekbar.value = 0;
		song.currentTime = 0;
	}
});

$('#back').click( function () {
	if(currentTrack > 0){
		currentTrack -= 1;
		song.pause();
		startPlay();
	}
});

$('#top-tabs a').click(function(){
	tab = $(this).attr('id').split('-')[1];
	getTop(tab);
});

window.addEventListener('unload', function () {
	if (song){
		song.pause();
		song = null;
	}
});
