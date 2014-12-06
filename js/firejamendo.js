var xmlhttp = new XMLHttpRequest({mozSystem: true});
var baseurl = "https://api.jamendo.com/v3.0/";
//var client_id = '795e43fd'; // DON'T EDIT. This ID is necesary for use the API
var client_id = 'b6747d04';
var data;
var playlist = {};
var song;
var currentTrack = 0;
var currentRadio = 0;
var artist_albums = {};
var artist_tracks = {};
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
	// Get data from Jamendo API
	if (params.search(/\?/) == -1){
		params += '?client_id='+client_id;
	}else{
		params += '&client_id='+client_id;
	}

	$.ajax({
		url: baseurl+params,
		type: 'GET',
		dataType: 'jsonp',
		jsonp: 'callback',
		error: function(xhr, status, error) {
			alert(_('data_error'));
		},
		success: function(jsonp) {
			cb(jsonp);
		}
	});
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
	console.log(playlist)
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
		if (currentTrack == Object.keys(playlist).length - 1){
			song.pause()
			seekbar.value = 0;
			currentTrack = 0;
			$('#current-time').text('00:00');
			$('#play i').removeClass('fa-pause')
			$('#play i').addClass('fa-play');
		}else{
			nextTrack();
		}
	});
	song.addEventListener("error", function(e){
		alert(_('stream_error'));
		return false;
	});
}

function getAlbum(id){
	// get album
	getData('albums/tracks?audioformat=ogg&id='+id, function(responseText) {
		data = responseText.results[0];
		console.log(responseText);
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
function getArtistTracks(id, cb){
	// get all artist tracks
	getData('artists/tracks?audioformat=ogg&imagesize=100&id='+id, function(responseText) {
		data = responseText.results[0];
		topTracks = {};
		for (i=0; i<data.tracks.length; i++){
			track_name = data.tracks[i].name;
			audio = data.tracks[i].audio;
			topTracks[i] = {"artist_name": data.name, "track_name": track_name, "image": data.tracks[i].album_image, "audio": audio, "album_name": data.tracks[i].album_name, 'download': data.tracks[i].audiodownload};
		}
		if( typeof cb === 'function' ){
			cb(topTracks);
		}
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
	params = top+'/?order=popularity_week&imagesize=100';
	if (top == 'tracks'){
		params +='&audiodlformat=ogg&imagesize=100'
	}
	getData(params, function(responseText) {
		data = responseText.results;
		$('#top-list').empty();
		for (i=0; i < data.length; i++){
			cover = '';
			if (data[i].album_image){
				cover = data.albums[i].image;
			}else if (data[i].image){
				cover = data[i].image;
			}else{
				cover = 'img/co-image.png';
			}
			if (top == 'albums'){
				$('#top-list').append('<div class="pure-u-1-2 pure-u-md-1-2 pure-u-lg-1-5"><a href="#" id="{0}" data-type="album"><img src="{1}" class="pure-img"><p><b>{2}</b><br />{3}</p></a></div>'.format(data[i].id, cover, data[i].name, data[i].artist_name));
			}else if (top == 'artists'){
				$('#top-list').append('<div class="pure-u-1-2 pure-u-md-1-2 pure-u-lg-1-5"><a href="#" id="{0}" data-type="artist"><img src="{1}" class="pure-img"><p><b>{2}</b></p></a></div>'.format(data[i].id, cover, data[i].name));
			}else{
				playlist[i] = {"artist_name": data[i].artist_name, "track_name": data[i].name, "image": cover, "audio": data[i].audio, "album_name": data[i].album_name, 'download': data[i].audiodownload};
				$('#top-list').append('<div class="pure-u-1-2 pure-u-md-1-2 pure-u-lg-1-5"><a href="#" id="{0}" data-type="track"><img src="{1}" class="pure-img"><p><b>{2}</b><br />{3}</p></a></div>'.format(i, cover, data[i].name, data[i].artist_name));
			}
		}
		$('#top-tabs .tab a').each(function(index){
			if ($(this).attr('id') == 'top-'+top){
				$(this).parent().addClass('active');
			}else{
				$(this).parent().removeClass('active');
			}
		});
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
		}else if (navigator.mozL10n.language.code == 'ge'){
			lang = 'ge';
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
				html = '<div class="pure-g">\
					<div class="pure-u"><a id="{0}" data-type="album" href="#"><img src="{1}"></a></div>\
					<div class="pure-u-1 pure-u-lg-2-3">\
					<h5>{2}</h5>\
					<h5>{3}</h5>\
					{4}</div></div>'.format(data[i].joinid, data[i].images.size315_111, data[i].title[lang], data[i].subtitle[lang], text);
			}else{
				type = _(data[i].type);
				html = '<div class="pure-g">\
					<div class="pure-u"><a id="{0}" data-type={1} href="#"><img src="{2}"></a></div>\
					<div class="pure-u-1 pure-u-lg-2-3">\
					<h5>{3}</h5>\
					<h5>{4}</h5>\
					{5}</div></div>'.format(data[i].joinid, data[i].type, data[i].images.size315_111, data[i].title[lang], type, text);
			}
			$('#news').append(html);
		}
	});
}

function getArtistData(id){
	$('#artist-tracks').hide();
	$('#tab-albums').parent().addClass('active');
	$('#tab-tracks').parent().removeClass('active');
	$('#artist-albums').show();

	getData('artists/albums?limit=all&id='+id, function(responseText) {
		data = responseText.results[0]
		$('#artist-albums').empty();
		$('#artist_name').text(data.name);
		joindate = new Date(data.joindate);
		$('#artist_joindate').text(joindate.toLocaleDateString(lang));
		if (responseText.results[0].website){
			$('#artist_website').attr('href', data.website);
		}else{
			$('#artist_website').attr('href', '#');
		}
		$('#artist_cover').attr('src', responseText.results[0].image);
		for (i=0; i<data.albums.length; i++){
			cover = ''
			if (data.albums[i].image){
				cover = data.albums[i].image;
			}else{
				cover = 'img/co-image.png';
			}
			artist_albums[i] = {"album_name": data.albums[i].name, "image": cover, "id": data.albums[i].id};
			$('#artist-albums').append('<div class="pure-u-1-2 pure-u-md-1-2 pure-u-lg-1-5"><a href="#" album-id="{0}"><img src="{1}" class="pure-img"><p><b>{2}</b></p></a></div>'.format(data.albums[i].id, cover, data.albums[i].name));
		}
		$('#artist_cover').attr('src', responseText.results[0].image);
		getArtistTracks(id, function(data){
			i = 0;
			$('#artist-tracks').empty();
			$.each(data, function(key, value){
				cover = ''
				if (value.image){
					cover = value.image;
				}else{
					cover = 'img/no-image.png';
				}
				artist_tracks[i] = {"artist_name": value.artist_name, "track_name": value.track_name, "image": cover, "audio": value.audio, "album_name": value.album_name, 'download': value.audiodownload}
				$('#artist-tracks').append('<div class="pure-u-1-2 pure-u-md-1-2 pure-u-lg-1-5"><a href="#" track-id="{0}"><img src="{1}" class="pure-img"><p><b>{2}</b></p></a></div>'.format(i, cover, value.track_name));
				i++;
			});
		});
	});
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
			$.each( data, function( key, value ) {
				image = ''
				if (value.image == '' || value.album_image == ''){
					image = 'img/no-image.png';
				}else if (value.image){
					image = value.image;
				}else{
					image = value.album_image;
				}
				$('#search-results').append('<div class="pure-u-1-2 pure-u-md-1-2 pure-u-lg-1-5"><a href="#" data-id={0} data-type={1}><img src="{2}" class="pure-img"><p><b>{3}</b></p></a></div>'.format(value.id, searchby, image, value.name));
			});
		});
	}
});

document.addEventListener('DOMContentLoaded', function(){
	changeDIV('news');
	getNews();
	$("#news").delegate('a', 'click', function() {
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
			getArtistTrackst(id, function(data){
				playlist = data;
			});
		}
		changeDIV('listen');
	});
	$("#radios-list").delegate('li a', 'click', function() {
		id = $(this).attr('id');
		getRadioStream(id);
		$('#now-listen').toggleClass('current');
		$('#radios').toggleClass('right');
	});
	$('#top-list').delegate('a', 'click', function(){
		type = $(this).attr('data-type');
		if (type == 'album'){
			getAlbum($(this).attr('id'));
		}else if (type == 'artist'){
			getArtistData($(this).attr('id'));
			$('#section-title').text(_('artist'));
			changeDIV('artist-info');
		}else{
			currentTrack = parseInt($(this).attr('data-track'));
			changeDIV('listen');
			startPlay();
		}
	});

	$('#search-results').delegate('a', 'click', function(){
		id = $(this).attr('data-id');
		type = $(this).attr('data-type');
		if (type == 'album'){
			getAlbum(id);
		}else if (type == 'tracks'){
			getTrack(id);
		}else{
			getArtistData(id);
			$('#section-title').text(_('artist'));
			changeDIV('artist-info');
		}
	});

	$('#artist-tracks').delegate('a', 'click', function(){
		playlist = artist_tracks;
		currentTrack = parseInt($(this).attr('track-id'));
		$('#section-title').text(_('now-listen'));
		changeDIV('listen');
		startPlay();
	});
	$('#artist-albums').delegate('a', 'click', function(){
		$('#section-title').text(_('now-listen'));
		changeDIV('listen');
		console.log(parseInt($(this).attr('album-id')));
		getAlbum(parseInt($(this).attr('album-id')));
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

$('#menu ul li a').click(function(){
	$('#menuLink').removeClass('active');
	$('#menu').removeClass('active');
	$('#layout').removeClass('active');
});

$('#btn-now-listen').click(function () {
	changeDIV('listen');
	$('#section-title').text(_('now-listen'));
});

$('#btn-radios').click( function () {
	changeDIV('radios');
	getData('radios/', function(responseText) {
		// radios
		data = responseText.results;
		for (i=0; i < data.length; i++){
			$('#radios').append('<div class="pure-u-1-2 pure-u-md-1-2 pure-u-lg-1-5"><a href="#" id="{0}"><img src="{1}" class="pure-img"><p>{2}</p></a></div>'.format(data[i].id, data[i].image, data[i].dispname));
		}
	});
});

$('#btn-top').click( function () {
	$('#section-title').text(_('top'));
	changeDIV('jamendo-top');
});

$('#btn-info').click( function () {
	$('#section-title').text(_('artist'));
	changeDIV('artist-info');
});

$('#btn-news').click( function () {
	$('#section-title').text(_('news'));
	changeDIV('news');
	getNews()
});
$('#btn-search').click( function () {
	$('#section-title').text(_('search'));
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

$('#artist-tabs .tab a').click(function(){
	tab = $(this).attr('id').split('-')[1]
	if (tab == 'tracks'){
		$(this).parent().addClass('active');
		$('#tab-albums').parent().removeClass('active');
		$('#artist-tracks').show();
		$('#artist-albums').hide();
	}else{
		$(this).parent().addClass('active');
		$('#tab-tracks').parent().removeClass('active');
		$('#artist-albums').show();
		$('#artist-tracks').hide();
	}
});

window.addEventListener('unload', function () {
	if (song){
		song.pause();
		song = null;
	}
});
