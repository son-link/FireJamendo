// global variables
var baseurl = "https://api.jamendo.com/v3.0/";
var client_id = '795e43fd'; // DON'T EDIT. This ID is necesary for use the API
var client_secret = 'e82c69ed561875cbad2868b209551b4c';
var data;
var playlist = {};
var player = document.getElementById('player');
var currentTrack = 0;
var currentRadio = 0;
var artist_albums = {};
var artist_tracks = {};
var user_tracks = {};
var top_tracks = {};
var access_token;
var radio_interval;
var artist_id = 0;
// For localizing strings in JavaScript
var _ = navigator.mozL10n.get;
navigator.mozL10n.once(start);
function start() {
	lang = navigator.mozL10n.language.code;
	if (lang.search(/es-*/) != -1){
		// Need for translate to all Spanish variants (es-ES, es-AR, es-MX, etc) on Firefox web browser
		navigator.mozL10n.language.code = 'es';
	}
}

// Common functions
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
		dataType: 'json',
		error: function(xhr, status, error) {
			onError(_('data_error'));
		},
		success: function(jsonp) {
			cb(jsonp);
		}
	});
}

function changeDIV(div){
	// hidde all the divs except the especific
	divs = ['radios', 'news', 'artist-info', 'listen', 'jamendo-top', 'search', 'profile', 'config'];
	for (i=0; i < divs.length; i++){
		if (div == divs[i]){
			$('#'+div).show();
		}else{
			$('#'+divs[i]).hide();
		}
	}
}


function changeTab(tab, tabs){
	for (i=0; i < tabs.length; i++){
		if (tab == tabs[i]){
			$('#'+tab).show();
			$('a[data-tab="' + tab + '"]').parent().addClass('active');
		}else{
			$('#'+tabs[i]).hide();
			if ($('a[data-tab="' + tabs[i] + '"]').parent().hasClass('active')){
				$('a[data-tab="' + tabs[i] + '"]').parent().toggleClass('active');
			}
		}
	}
}

function onError(msg){
	$('#error').show(500).delay(5000).fadeOut();
	$('#error').text(msg);
}

function setConfig(reset){
	// Set init conf
	window.localStorage.top_orderby = "popularity_total";
	window.localStorage.profile_limit = 10;
	window.localStorage.top_limit = 10;
	window.localStorage.down_format = "ogg";
	window.localStorage.share_track = _('share-track');
	window.localStorage.share_artist = _('share-artist');
	if (reset){
		$("#config-form").find(':input').each(function() {
			this.value = window.localStorage[this.id];
		});
	}
}

function startPlay(){
	// Start play song
	if (player){
		player.pause();
	}
	if (playlist[currentTrack].audio.search('https://streaming.jamendo.com') != 0){
		clearInterval(radio_interval);
	}
	player.src = playlist[currentTrack].audio;
	player.setAttribute('mozaudiochannel', 'content');
	player.load();
	$('#track-name').text(playlist[currentTrack].track_name);
	$('#artist').text(playlist[currentTrack].artist_name);
	$('#album-art').attr('src', playlist[currentTrack].image);
	if (playlist[currentTrack].album_name){
		$('#album').text(playlist[currentTrack].album_name);
	}
	$('.download').attr('href', 'https://storage-new.newjamendo.com/download/track/{0}/{1}/'.format(playlist[currentTrack].track_id, window.localStorage.down_format));

	$('#play i').removeClass('fa-play')
	$('#play i').addClass('fa-pause');
	var seekbar = document.getElementById('seekbar');
	seekbar.addEventListener("change", function(){
		player.currentTime = seekbar.value;
	});
	seekbar.max = player.duration;
	player.addEventListener('timeupdate',function (){
		var curtime = parseInt(player.currentTime, 10);
		seekbar.value = curtime;
		seekbar.max = player.duration;
		$('#current-time').text(convertTime(curtime));
		$('#total-time').text(convertTime(player.duration));
	});
	player.addEventListener('ended',function (){
		if (currentTrack == Object.keys(playlist).length - 1){
			player.pause()
			seekbar.value = 0;
			currentTrack = 0;
			$('#current-time').text('00:00');
			$('#play i').removeClass('fa-pause')
			$('#play i').addClass('fa-play');
		}else{
			nextTrack();
		}
	});
	player.addEventListener("error", function(e){
		if (window.location.protocol != "app:"){
			console.error(e);
			onError(_('stream_error'));
		}
	});
	player.addEventListener('mozinterruptbegin', function onInterrupted(e) {
		console.error(e);
	});
	player.play();
}

function getAlbum(id){
	// get album
	getData('albums/tracks?audioformat=ogg&id='+id, function(responseText) {
		data = responseText.results[0];
		playlist = {};
		for (i=0; i<data.tracks.length; i++){
			track_name = data.tracks[i].name;
			audio = data.tracks[i].audio;
			playlist[i] = {"artist_name": data.artist_name, "album_name": data.name, "track_name": track_name, "image": data.image, "audio": audio, 'track_id': data.tracks[i].id};
		}
		$('#controls').show();
		$('#radio-control').hide();
		$('#section-title').text(_('now-listen'));
		changeDIV('listen');
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
			playlist[i] = {"artist_name": data.tracks[i].artist_name, "track_name": track_name, "image": data.tracks[i].album_image, "audio": audio, 'track_id': data.tracks[i].id};
		}
		$('#controls').show();
		$('#radio-control').hide();
		startPlay();
	});
}
function getArtistTracks(id, cb){
	// get all artist tracks
	getData('artists/tracks?audioformat=ogg&imagesize=100&id='+id, function(responseText) {
		data = responseText.results[0];
		topTracks = {};
		i = 0;
		$.each(data.tracks, function(key, value){
			track_name = value.name;
			audio = value.audio;
			topTracks[i] = {"track_id": value.id, "artist_name": data.name, "track_name": track_name, "image": value.album_image, "audio": audio, "album_name": value.album_name};
			i++;
		});
		if( typeof cb === 'function' ){
			cb(topTracks);
		}
	});
}
function getRadioStream(id){
	// get Radio Stream
	changeDIV('listen');
	$('#section-title').text(_('now-listen'));
	if (currentRadio != id || player.src != ''){
		clearInterval(radio_interval);
		currentRadio = id;
		getData('radios/stream?id='+id, function(responseText) {
			playlist = {};
			$('#play-radio i').removeClass('fa-play');
			$('#play-radio i').addClass('fa-pause');
			data = responseText.results[0];
			playlist[0] = {"artist_name": data.playingnow.artist_name, "track_name": data.playingnow.track_name, "image": data.playingnow.track_image, "audio": data.stream, "album_name": data.playingnow.album_name, 'track_id': data.playingnow.track_id};
			startPlay();
			$('#controls').hide();
			$('#radio-control').show();
			// set interval for get the next track info
			radio_interval = setInterval(function(){
				getRadioStream(id)
			}, parseInt(data.callmeback));
		 });
	}else{
		getData('radios/stream?id='+id, function(responseText) {
			data = responseText.results[0];
			$('#track-name').text(data.playingnow.track_name);
			$('#artist').text(data.playingnow.artist_name);
			$('#album-art').attr('src', data.playingnow.track_image);
			$('#album').text(data.playingnow.album_name);
			playlist[0].track_id = data.playingnow.track_id
			radio_interval = setInterval(function(){
				getRadioStream(id)
			}, parseInt(data.callmeback));
		});
	}
}
function getTrack(id){
	getData('artists/tracks?audioformat=ogg&imagesize=100&track_id='+id, function(responseText) {
		data = responseText.results[0].tracks[0];
		playlist = {};
		playlist[0] = {"artist_name": data.name, "track_name": data.track_name, "image": data.album_image, "audio": data.audio, "album_name": data.album_name, 'download': data.audiodownload, 'track_id': data.id};
		$('#controls').show();
		$('#radio-control').hide();
		startPlay();
	});
}
function getTop(top){
	params = top+'/?order={0}&limit={1}&imagesize=100'.format(window.localStorage.top_orderby, parseInt(window.localStorage.top_limit));
	getData(params, function(responseText) {
		data = responseText.results;
		$('#top-list').empty();
		for (i=0; i < data.length; i++){
			cover = '';
			if (data[i].album_image){
				cover = data[i].album_image;
			}else if (data[i].image){
				cover = data[i].image;
			}else{
				cover = 'img/no-image.png';
			}
			if (top == 'albums'){
				$('#top-list').append('<div class="pure-u-1-2 pure-u-md-1-2 pure-u-lg-1-5"><a href="#" id="{0}" data-type="album"><img src="{1}" class="pure-img"><p><b>{2}</b><br />{3}</p></a></div>'.format(data[i].id, cover, data[i].name, data[i].artist_name));
			}else if (top == 'artists'){
				$('#top-list').append('<div class="pure-u-1-2 pure-u-md-1-2 pure-u-lg-1-5"><a href="#" id="{0}" data-type="artist"><img src="{1}" class="pure-img"><p><b>{2}</b></p></a></div>'.format(data[i].id, cover, data[i].name));
			}else{
				top_tracks[i] = {"artist_name": data[i].artist_name, "track_name": data[i].name, "image": cover, "audio": data[i].audio, "album_name": data[i].album_name, 'download': data[i].audiodownload, 'track_id': data[i].id};
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
		player.pause();
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
		$('#news').empty();
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
	artist_id = id;
	$('#artist-tracks').hide();
	$('#tab-albums').parent().addClass('active');
	$('#tab-tracks').parent().removeClass('active');
	$('#artist-albums').show();

	getData('artists/albums?limit=all&id='+id, function(responseText) {
		data = responseText.results[0]
		$('#artist-albums').empty();
		$('#artist_name').text(data.name);
		$('#artist_cover').attr('src', responseText.results[0].image);
		for (i=0; i<data.albums.length; i++){
			cover = ''
			if (data.albums[i].image){
				cover = data.albums[i].image;
			}else{
				cover = 'img/no-image.png';
			}
			artist_albums[i] = {"album_name": data.albums[i].name, "image": cover, "id": data.albums[i].id};
			$('#artist-albums').append('<div class="pure-u-1-2 pure-u-md-1-2 pure-u-lg-1-5"><a href="#" album-id="{0}"><img src="{1}" class="pure-img"><p><b>{2}</b></p></a></div>'.format(data.albums[i].id, cover, data.albums[i].name));
		}
		$('#artist_cover').attr('src', responseText.results[0].image);
	});
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
			artist_tracks[i] = {"artist_name": value.artist_name, "track_name": value.track_name, "image": cover, "audio": value.audio, "album_name": value.album_name, 'track_id': value.track_id}
			$('#artist-tracks').append('<div class="pure-u-1-2 pure-u-md-1-2 pure-u-lg-1-5"><a href="#" track-id="{0}" data-type="artist-track"><img src="{1}" class="pure-img"><p><b>{2}</b></p></a></div>'.format(i, cover, value.track_name));
			i++;
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

function getToken(url, type){
	if (type == 'new'){
		params = {'client_id': client_id, 'client_secret': client_secret, 'code': window.localStorage.code, 'grant_type': 'authorization_code', 'redirect_uri': url};
	}else if (type == 'refresh'){
		params = {'client_id': client_id, 'client_secret': client_secret, 'grant_type': 'refresh_token', 'refresh_token': window.localStorage.refresh_token};
	}
	$.ajax({
		url: 'https://api.jamendo.com/v3.0/oauth/grant',
		data: params,
		type: 'POST',
		dataType: 'json',
		error: function(xhr, status, error) {
			console.error(status);
		},
		success: function(jsonp) {
			$('#btn-login').text(_('logout'));
			window.localStorage.access_token = jsonp.access_token;
			window.localStorage.refresh_token = jsonp.refresh_token;
			if (type == 'refresh'){
				getUserData();
			}
		}
	});
}

function JamendoLogin(){
	url = '';
	if (window.location.protocol == "app:"){
		url = 'http://localhost';
	}else{
		url = window.location.href.replace(/[^\/]*$/, '')+'redirect.html';
	}
	OauthUrl = 'https://api.jamendo.com/v3.0/oauth/authorize?client_id='+client_id+'&redirect_uri='+url
	if ( ! window.localStorage.access_token){
		var authWindow = window.open(OauthUrl);
		window.addEventListener('message', function(evt) {
			authWindow.close();
			window.localStorage.code = evt.data.code;
			getToken(url, 'new');
		});
	}else{
		getToken(url, 'refresh');
	}
}

function JamendoLogout(){
	// Logout from your Jamendo acoount.
	window.localStorage.username = '';
	window.localStorage.user_image = '';
	window.localStorage.code = ''
	window.localStorage.access_token = '';
	window.localStorage.refresh_token = '';
	$('#btn-login').text(_('login'));
}

function getUserData(){
	changeDIV('profile');
	$('#section-title').text(_('profile'));
	$('#user-albums').empty()
	$('#user-tracks').empty()
	changeTab('user-albums', ['user-tracks', 'user-albums', 'user-artists']);
	getData('users/albums?access_token={0}&limit={1}'.format(window.localStorage.access_token, window.localStorage.profile_limit), function(responseText){
		data = responseText.results[0];
		window.localStorage.username = data.dispname;
		window.localStorage.user_image = data.image;
		$('#user_img').attr('src', window.localStorage.user_image);
		$('#username').text(window.localStorage.username);
		for (i=0; i<data.albums.length; i++){
			cover = ''
			if (data.albums[i].image){
				cover = data.albums[i].image;
			}else{
				cover = 'img/no-image.png';
			}
			$('#user-albums').append('<div class="pure-u-1-2 pure-u-md-1-2 pure-u-lg-1-5"><a href="#" album-id="{0}"><img src="{1}" class="pure-img"><p><b>{2}</b><br/>{3}</p></a></div>'.format(data.albums[i].id, cover, data.albums[i].name, data.albums[i].artist_name));
		}
	});
	getData('users/artists?access_token='+window.localStorage.access_token, function(responseText){
		data = responseText.results[0]
		for (i=0; i<data.artists.length; i++){
			cover = ''
			if (data.artists[i].image){
				cover = data.artists[i].image;
			}else{
				cover = 'img/no-image.png';
			}
			$('#user-artists').append('<div class="pure-u-1-2 pure-u-md-1-2 pure-u-lg-1-5"><a href="#" id="{0}" data-type="artist"><img src="{1}" class="pure-img"><p><b>{2}</b></p></a></div>'.format(data.artists[i].id, cover, data.artists[i].name));
		}
	});
	getData('users/tracks?access_token='+window.localStorage.access_token, function(responseText){
		data = responseText.results[0]
		for (i=0; i<data.tracks.length; i++){
			cover = ''
			if (data.tracks[i].album_image){
				cover = data.tracks[i].album_image;
			}else{
				cover = 'img/no-image.png';
			}
			user_tracks[i] = {"artist_name": data.tracks[i].artist_name, "track_name": data.tracks[i].track_name, "image": cover, "audio": data.tracks[i].audio, "album_name": data.tracks[i].album_name, 'download': data.tracks[i].audiodownload, 'track_id': data.tracks[i].id}
			$('#user-tracks').append('<div class="pure-u-1-2 pure-u-md-1-2 pure-u-lg-1-5"><a href="#" track-id="{0}"><img src="{1}" class="pure-img" data-type="user-track"><p><b>{2}</b><br/>{3}</p></a></div>'.format(i, cover, data.tracks[i].name, data.tracks[i].artist_name));
		}
	});
}

function share(web, type){
	msg = '';
	url = '';
	// Share now playing in social networks (Facebook, Twitter, G+, etc)
	if (type == 'now-listen' && playlist[currentTrack]){
		url = 'http://jamen.do/t/'+playlist[currentTrack].track_id;
		msg = window.localStorage.share_track.format(playlist[currentTrack].track_name, playlist[currentTrack].artist_name);
	}else if (type == 'artist' && artist_id != 0){
		url = 'http://jamen.do/a/'+artist_id
		msg = window.localStorage.share_artist.format($('#artist_name').text());
	}else{
		return false;
	}
	if (web == 'twitter'){
		ShareUrl = 'http://twitter.com/intent/tweet?text='+msg+'&url='+url;
	}else if (web == 'facebook'){
		ShareUrl = 'http://www.facebook.com/sharer/sharer.php?u='+url;
	}else if (web == 'g+'){
		ShareUrl = 'https://plus.google.com/share?url='+url;
	}
	window.open(ShareUrl);
}

document.addEventListener('DOMContentLoaded', function(){
	if (! window.localStorage.profile-limit){
		setConfig();
	}
	changeDIV('news');
	$('#radio-control').hide();
	getNews();
	$("#news").delegate('a', 'click', function() {
		id = $(this).attr('id');
		type = $(this).attr('data-type');
		if (player){
			player.pause();
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
	$("#radios").delegate('a', 'click', function() {
		id = $(this).attr('id');
		getRadioStream(id);
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
			playlist = top_tracks;
			currentTrack = parseInt($(this).attr('id'));
			startPlay();
			$('#section-title').text(_('now-listen'));
			changeDIV('listen');
		}
	});

	$('#search-results').delegate('a', 'click', function(){
		id = $(this).attr('data-id');
		type = $(this).attr('data-type');
		if (type == 'album'){
			getAlbum(id);
		}else if (type == 'track'){
			getTrack(id);
		}else{
			getArtistData(id);
			$('#section-title').text(_('artist'));
			changeDIV('artist-info');
		}
	});

	$('#artist-tracks, #user-tracks').delegate('a', 'click', function(){
		if ($(this).attr('data-type') == 'artist-track'){
			playlist = artist_tracks;
		}else{
			playlist = user_tracks;
		}
		currentTrack = parseInt($(this).attr('track-id'));
		$('#section-title').text(_('now-listen'));
		changeDIV('listen');
		startPlay();
	});
	$('#artist-albums, #user-albums').delegate('a', 'click', function(){
		$('#section-title').text(_('now-listen'));
		changeDIV('listen');
		getAlbum(parseInt($(this).attr('album-id')));
	});

	// need for translate the app
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
	$('#section-title').text(_('radios'));
	if( $('#radios').is(':empty') ) {
		getData('radios/', function(responseText) {
			// radios
			data = responseText.results;
			for (i=0; i < data.length; i++){
				$('#radios').append('<div class="pure-u-1-2 pure-u-md-1-2 pure-u-lg-1-5"><a href="#" id="{0}"><img src="{1}" class="pure-img"><p>{2}</p></a></div>'.format(data[i].id, data[i].image, data[i].dispname));
			}
		});
	}
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
$('#play, #play-radio').click( function () {
	if (player.paused){
		$('i', this).removeClass('fa-play');
		$('i', this).addClass('fa-pause');
		if ($(this).attr('id') == 'play-radio'){
			player.src = '';
			getRadioStream(currentRadio);
		}else{
			player.play();
		}
	}else{
		if ($(this).attr('id') == 'play-radio'){
			clearInterval(radio_interval);
		}
		player.pause();
		$('i', this).removeClass('fa-pause')
		$('i', this).addClass('fa-play');
	}
});

$('#next').click( function () {
	if (player){
		nextTrack();
	}
});

$('#stop').click( function () {
	if (player){
		if (player.paused){
			$('#play i').removeClass('fa-pause')
			$('#play i').addClass('fa-play');
		}
		player.pause();
		seekbar.value = 0;
		player.currentTime = 0;
	}
});

$('#back').click( function () {
	if(currentTrack > 0){
		currentTrack -= 1;
		player.pause();
		startPlay();
	}
});

$('#top-tabs a').click(function(){
	tab = $(this).attr('id').split('-')[1];
	getTop(tab);
});

$('#btn-profile').click(function(){
	if ( ! window.localStorage.access_token){
		onError(_('no-logged'));
	}else{
		getUserData();
	}
});

$('#btn-login').click(function(){
	if (window.localStorage.access_token){
		JamendoLogout();
	}else{
		JamendoLogin();
	}
});

$('#btn-config').click(function(){
	if (window.localStorage.access_token){
		$('#btn-login').text(_('logout'));
	}else{
		$('#btn-login').text(_('login'));
	}
	$('#section-title').text(_('config'));
	// Set values from config
	$("#config-form").find(':input').each(function() {
		this.value = window.localStorage[this.id];
	});
	changeDIV('config');
});

$('#artist-tabs .tab a').click(function(){
	tab = $(this).attr('data-tab');
	changeTab(tab, ['artist-tracks', 'artist-albums']);
});

$('#user-tabs .tab a').click(function(){
	tab = $(this).attr('data-tab');
	changeTab(tab, ['user-tracks', 'user-albums', 'user-artists']);
});

$('.share_buttons a').click(function(){
	type =$(this).closest('div').attr('data-type');
	share($(this).attr('id'), type);
});

$('#saveconf').click(function(e){
	e.preventDefault();
		$("#config-form").find(':input').each(function() {
		if (this.id != 'saveconf'){
			if (this.id == 'profile_limit' || this.id == 'top_limit'){
				if (this.value < 10 || this.value > 100){
					$(this).addClass('form_error');
					$(this).focus();
					onError(_('limit_error'));
					return false
				}else{
					$(this).removeClass('form_error');
				}
			}
			window.localStorage[this.id] = this.value;
		}
	});
});

$('#clear-data').click(function(e){
	e.preventDefault();
	clear = confirm(_('clear-data-msg'));
	if (clear){
		window.localStorage.clear();

		setConfig(true);
	}
});

$('#user-artists').delegate('a', 'click', function(){
	getArtistData($(this).attr('id'));
	$('#section-title').text(_('artist'));
	changeDIV('artist-info');
	changeTab('artist-albums', ['artist-tracks', 'artist-albums']);
});

window.addEventListener('unload', function () {
	if (player){
		player.pause();
		player.src = '';
		player = null;
	}
});
