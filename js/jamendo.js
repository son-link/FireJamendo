var xmlhttp = new XMLHttpRequest();
var baseurl = "https://api.jamendo.com/v3.0/";
var client_id = '795e43fd';
var data;
var playlist = {};
var song;
var currentTrack = 0;
var currentRadio = 0;

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
	if (params.search(/\?/) == -1){
		params += '?client_id='+client_id;
	}else{
		params += '&client_id='+client_id;
	}

	url = baseurl+params;
	xmlhttp.open("GET", url, true);
	xmlhttp.send();
}

function startPlay(){
	song = new Audio(playlist[currentTrack].audio);
	$('#track-name').text(playlist[currentTrack].track_name);
	$('#artist').text(playlist[currentTrack].artist_name);
	$('#album-art').attr('src', playlist[currentTrack].image);
	if (playlist[currentTrack].album_name){
		$('#album').text(playlist[currentTrack].album_name);
	}
	song.play();
	$('#play').attr('data-icon', 'pause');
	var seekbar = document.getElementById('seekbar');
	seekbar.addEventListener("change", function(){
		song.currentTime = seekbar.value;
	});
	seekbar.max = song.duration;
	song.addEventListener('timeupdate',function (){
		var curtime = parseInt(song.currentTime, 10);
		seekbar.value = curtime;
		seekbar.max = song.duration;
		$('#current').text(convertTime(curtime));
		$('#total').text(convertTime(song.duration));
	});
	song.addEventListener('ended',function (){
		nextTrack();
	});
}

function getAlbum(id){
	// get album
	getData('albums/tracks?audioformat=ogg&id='+id, function(responseText) {
		data = responseText.results[0];
		for (i=0; i<data.tracks.length; i++){
			track_name = data.tracks[i].name;
			audio = data.tracks[i].audio;
			playlist[i] = {"artist_name": data.artist_name, "album_name": data.name, "track_name": track_name, "image": data.image, "audio": audio};
		}
		$('#controls').toggleClass('');
		startPlay();
	});
}
function getPlaylist(id){
	// get playlist
	getData('playlists/tracks?audioformat=ogg&id='+id, function(responseText) {
		data = responseText.results[0];
		for (i=0; i<data.tracks.length; i++){
			track_name = data.tracks[i].name;
			audio = data.tracks[i].audio;
			playlist[i] = {"artist_name": data.tracks[i].artist_name, "track_name": track_name, "image": data.tracks[i].album_image, "audio": audio};
		}
		$('#controls').toggleClass('');
		startPlay();
	});
}
function getArtistTrackst(id){
	// get all artist tracks
	getData('artists/tracks?audioformat=ogg&id='+id, function(responseText) {
		data = responseText.results[0];
		for (i=0; i<data.tracks.length; i++){
			track_name = data.tracks[i].name;
			audio = data.tracks[i].audio;
			playlist[i] = {"artist_name": data.name, "track_name": track_name, "image": data.tracks[i].album_image, "audio": audio, "album_name": data.tracks[i].album_name};
		}
		$('#controls').toggleClass('');
		startPlay();
	});
}
function getRadioStream(id){
	// get Radio Stream
	if (currentRadio != id){
		currentRadio = id;
		getData('radios/stream?id='+id, function(responseText) {
			data = responseText.results[0];
			playlist[0] = {"artist_name": data.playingnow.artist_name, "track_name": data.playingnow.track_name, "image": data.playingnow.track_image, "audio": data.stream, "album_name": data.playingnow.album_name};
			if (song){
				song.pause();
			}
			// set interval for get the next track info
			$('#controls').toggleClass('hidden');
			startPlay();
			setInterval(function () {getRadioStream(id)}, parseInt(data.callmeback));
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
function nextTrack(){
	// change to next track
	if(currentTrack >= 0 && currentTrack < Object.keys(playlist).length - 1){
		currentTrack += 1;
		song.pause();
		startPlay();
	}else if (currentTrack = Object.keys(playlist).length - 1){
		song.pause()
		seekbar.value = 0;
	}
}
document.addEventListener('DOMContentLoaded', function(){
	getData('feeds/', function(responseText) {
    // News
		data = responseText.results;
		for (i=0; i<data.length; i++){
			if (data[i].type == "album"){
				html = '<article class="col-1-2"> \
					<div class="hero">\
						<a id="{0}" data-type="album"><img src="{1}"></a>\
						<div class="text">{2}</div>\
					</div>\
					<p class="title">{3}</p>\
					{4}"\
				</article>'.format(data[i].joinid, data[i].images.size315_111, data[i].title.es, data[i].subtitle.es, data[i].text.es);
			}else{
				html = '<article class="col-1-2"> \
					<div class="hero">\
						<a id="{0}" data-type={1}><img src="{2}"></a>\
						<div class="text">{3}</div>\
					</div>\
					<p class="title">{4}</p>\
					{5}"\
				</article>'.format(data[i].joinid, data[i].type, data[i].images.size315_111, data[i].title.es, data[i].type, data[i].text.es);
			}
			$('#news').append(html);
		}
	});
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
		$('#now-listen').toggleClass('current');
		$('[data-position="current"]').toggleClass('left');
	});
	$("#radios-list").delegate('li a', 'click', function() {
		id = $(this).attr('id');
		getRadioStream(id);
		$('#now-listen').toggleClass('current');
		$('#radios').toggleClass('right');
	});

	// need for translate the app
	var translate = navigator.mozL10n.get;
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
	$('#now-listen').toggleClass('current');
	$('[data-position="current"]').toggleClass('left');
});
$('#btn-buttons-back').click( function () {
	$('#now-listen').toggleClass('right');
	$('[data-position="current"]').toggleClass('current');
});
$('#btn-radios').click( function () {
	$('#radios').toggleClass('current');
	$('[data-position="current"]').toggleClass('left');
	getData('radios/', function(responseText) {
		// radios
		data = responseText.results;
		for (i=0; i < data.length; i++){
			$('#radios-list').append('<li><aside><img src="{0}"></aside><a href="#" id="{1}"><p>{2}</p></a></li>'.format(data[i].image, data[i].id, data[i].dispname));
		}
	});
});
$('#btn-radios-back').click( function () {
	$('#radios').toggleClass('right');
	$('[data-position="current"]').toggleClass('current');
});

$('#play').click( function () {
	if (song.paused){
		song.play();
		$('#play').attr('data-icon', 'pause');
	}else{
		song.pause();
		$('#play').attr('data-icon', 'play');
	}
});
$('#next').click( function () {
	if (song){
		nextTrack();
	}
});
$('#stop').click( function () {
	if (song){
		song.pause();
		seekbar.value = 0;
		song.currentTime = 0;
		$('#play').attr('data-icon', 'play');
	}
});
$('#back').click( function () {
	if(currentTrack > 0){
		currentTrack -= 1;
		song.pause();
		startPlay();
	}
});
