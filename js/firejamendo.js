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
var album_tracks = {};
var access_token;
var radio_interval;
var artist_id = 0;
var album_id = 0;
var qs = function(selector) {return document.querySelector(selector)};
var feed = {};
var jamendoLangs = ['en', 'es', 'it', 'de', 'fr', 'pl'];
var config;
// For localizing strings in JavaScript
var _ = navigator.mozL10n.get;
navigator.mozL10n.once(start);
function start() {
	config = JSON.stringify({
		top_orderby : "popularity_total",
		profile_limit : 10,
		top_limit : 10,
		down_format : "ogg1",
		share_track : _('share-track'),
		share_artist : _('share-artist'),
		share_album : _('share-album'),
		notification_msg : _('notification-msg'),
		show_notifications : true,
		album_reviews_lang : 'any',
		album_reviews_order : 'addeddate',
		reviews_order_descent : false,
		hasscore : false,
		album_reviews_limit : 10,
	});
	lang = navigator.mozL10n.language.code;

	checkConfig();
	getNews();
}

var localCache = {
	data: {},
    remove: function (url) {
        delete localCache.data[url];
    },
    exist: function (url) {
        return localCache.data.hasOwnProperty(url) && localCache.data[url] !== null;
    },
    get: function (url) {
        console.log('Getting in cache for url ' + url);
        return localCache.data[url];
    },
    set: function (url, cachedData, callback) {
        localCache.remove(url);
        localCache.data[url] = cachedData;
        if ($.isFunction(callback)) callback(cachedData);
    }
};

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

function getConf(key){
	return JSON.parse(localStorage.config)[key];
}

function getData(params, cb){
	// Get data from Jamendo API
	qs('#loading').style.display = 'block';
	if (params.search(/\?/) == -1){
		params += '?client_id='+client_id;
	}else{
		params += '&client_id='+client_id;
	}
	var url = baseurl+params
	$.ajax({
		url: url,
		type: 'GET',
		dataType: 'json',
		cache: true,
		error: function(xhr, status, error) {
			qs('#loading').style.display = 'none';
			if (status != 'abort'){
				onError(_('data_error'));
			}
		},
		success: function(json) {
			qs('#loading').style.display = 'none';
			if (cb){
				localCache.set(url, json, cb);
			}
		},

		beforeSend: function () {
			if (localCache.exist(url)) {
				qs('#loading').style.display = 'none';
				cb(localCache.get(url));
				return false;
			}
			return true;
		}
	});
}

function changeDIV(div){
	// hidde all the divs except the especific
	divs = ['radios', 'news', 'artist-info', 'now-listen', 'jamendo-top', 'search', 'profile', 'config', 'album-info', 'download_list'];
	for (i=0; i < divs.length-1; i++){
		if (div == divs[i]){
			qs('#'+div).style.display = 'block';
		}else{
			qs('#'+divs[i]).style.display = 'none';
		}
	}
}

function changeTab(tab, tabs){
	// Change tab
	for (i=0; i < tabs.length; i++){
		if (tab == tabs[i]){
			qs('#'+tab).style.display = 'block';
			$('a[data-tab="' + tab + '"]').parent().addClass('active');
		}else{
			qs('#'+tabs[i]).style.display = 'none';
			if ($('a[data-tab="' + tabs[i] + '"]').parent().hasClass('active')){
				$('a[data-tab="' + tabs[i] + '"]').parent().toggleClass('active');
			}
		}
	}
}

function onError(msg){
	console.error(msg)
	qs('#error').style.display = 'block';
   setTimeout(function () {
		qs('#error').style.display = 'none';
   }, 5000);
	$('#error').text(msg);
}

function checkConfig(){
	if (localStorage.config){
		// For update actual system config
		conf = localStorage.config;
		$.each(config, function(key, value){
			if (! conf[key]){
				conf[key] = config[key];
			}
		});
		localStorage.setItem('config', conf);
	}else if (localStorage.top_orderby){
		// If the user has used FireJamendo =< 0.5.2 save the config to new system
		$.each(config, function(key, value){
			if (localStorage[key]){
				config[key] = localStorage[key];
				localStorage[key] = '';
			}
		});
		localStorage.setItem('config', config);
	}else{
		localStorage.setItem('config', config);
	}
}

function notifyMe(body) {
	if (!('Notification' in window)) {
		alert('This browser does not support desktop notification');
	}
	else if (Notification.permission === 'granted') {
		var notification = new Notification('Firejamendo', {'body': body, 'icon': playlist[currentTrack].image, tag: 'firejamendo'});
		notification.onclick = function(){
			$('#section-title').text(_('now-listen'));
			changeDIV('now-listen');
		}
	}
	else if (Notification.permission !== 'denied') {
		Notification.requestPermission(function (permission) {
			if (permission === 'granted') {
				var notification = new Notification('FireJamendo', {'body': body, 'icon': playlist[currentTrack].image, tag: 'firejamendo'});
				notification.onclick = function(){
					$('#section-title').text(_('now-listen'));
					changeDIV('now-listen');
				}
			}
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
	player.play();
	$('#track-name').text(playlist[currentTrack].track_name);
	$('#artist').text(playlist[currentTrack].artist_name);
	notifyMsg = playlist[currentTrack].artist_name+' - '+playlist[currentTrack].track_name;
	document.title = 'FireJamendo: '+notifyMsg;
	if (getConf('show_notifications')){
		notifyMe(notifyMsg);
	}
	$('#album-art').attr('src', playlist[currentTrack].image);
	if (playlist[currentTrack].album_name){
		$('#album').text(playlist[currentTrack].album_name);
	}
	$('.download').attr('href', 'http://storage-new.newjamendo.com/download/track/{0}/{1}/'.format(playlist[currentTrack].track_id, getConf('down_format')));
	$('#play i').removeClass('icon-play')
	$('#play i').addClass('icon-pause');
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
	player.addEventListener('ended',function _func(){
		if (currentTrack == Object.keys(playlist).length - 1){
			player.pause()
			seekbar.value = 0;
			currentTrack = 0;
			$('#current-time').text('00:00');
			$('#play i').removeClass('icon-pause')
			$('#play i').addClass('icon-play');
		}else{
			player.removeEventListener('ended', _func);
			nextTrack();
		}
	});
	player.addEventListener("error", function(e){
		console.error(e);
		onError(_('stream_error'));
		clearInterval(radio_interval);
		player.pause();
		player.src = '';
	});
	player.addEventListener('mozinterruptbegin', function onInterrupted(e) {
		console.error(e);
	});
}

function getAlbum(id){
	// get album
	changeDIV('album-info');
	$('#section-title').text(_('album-info'));
	changeTab('album-tracks', ['album-tracks', 'album-reviews']);
	getData('albums/tracks?audioformat=ogg&id='+id, function(responseText) {
		data = responseText.results[0];
		album_tracks = {};
		album_id = id;
		$('#album-tracks ul').empty();
		cover = ''
		if (data.image){
			cover = data.image;
		}else{
			cover = 'img/no-image.png';
		}
		$('#album_cover').attr('src', cover);
		$('#album_name').text(data.name);
		$('#album_artist').text(data.artist_name);
		$('#down_album').attr('href', 'https://storage-new.newjamendo.com/download/a{0}/{1}/'.format(id, getConf('down_format')));
		for (i=0; i<data.tracks.length; i++){
			track_name = data.tracks[i].name;
			audio = data.tracks[i].audio;
			album_tracks[i] = {"artist_name": data.artist_name, "album_name": data.name, "track_name": track_name, "image": cover, "audio": audio, 'track_id': data.tracks[i].id};
			$('#album-tracks ul').append('<li><p><a href="#" data-album-track="{0}">{1}</a></p></li>'.format(i, track_name));
		}
	});
	var params = 'album_id={0}&limit{1}'.format(id, getConf('album_reviews_limit'));
	orderby = getConf('album_reviews_order');
	if (getConf('reviews_order_descent')){
		orderby += '_desc'
	}
	params += '&order='+orderby;
	if (getConf('album_reviews_lang') != 'any'){
		params += '&lang='+getConf('album_reviews_lang');
	}
	if (getConf('hasscore')){
		params += '&hasscore=true';
	}
	getData('reviews/albums?'+params, function(responseText){
		data = responseText.results;
		$.each(data, function(key, value){
			if (value.score >= 1){
				value.score = parseInt(value.score)*10;
			}else{
				value.score = 0;
			}
			$('#album-reviews ul').append(tmpl('reviews', value));
		});
	});
}
function getPlaylist(id){
	// get playlist
	getData('playlists/tracks?audioformat=ogg&id='+id, function(responseText) {
		playlist = {};
		currentTrack = 0;
		data = responseText.results[0];
		for (i=0; i<data.tracks.length; i++){
			track_name = data.tracks[i].name;
			audio = data.tracks[i].audio;
			playlist[i] = {"artist_name": data.tracks[i].artist_name, "track_name": track_name, "image": data.tracks[i].album_image, "audio": audio, 'track_id': data.tracks[i].id, "album_name": data.tracks[i].name};
		}
		changeDIV('now-listen');
		qs('#controls').style.display = 'block';
		qs('#radio-control').style.display = 'none';
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
	changeDIV('now-listen');
	$('#section-title').text(_('now-listen'));
	if (currentRadio != id || player.src != ''){
		clearInterval(radio_interval);
		currentRadio = id;
		getData('radios/stream?id='+id, function(responseText) {
			playlist = {};
			$('#play-radio i').removeClass('icon-play');
			$('#play-radio i').addClass('icon-pause');
			data = responseText.results[0];
			playlist[0] = {"artist_name": data.playingnow.artist_name, "track_name": data.playingnow.track_name, "image": data.playingnow.track_image, "audio": data.stream, "album_name": data.playingnow.album_name, 'track_id': data.playingnow.track_id};
			qs('#controls').style.display = 'none';
			qs('#radio-control').style.display = 'block';
			// set interval for get the next track info
			radio_interval = setInterval(function(){
				getRadioStream(id)
			}, parseInt(data.callmeback));
			currentTrack = 0;
			startPlay();
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
		currentTrack = 0;
		playlist[0] = {"artist_name": responseText.results[0].name, "track_name": data.track_name, "image": data.album_image, "audio": data.audio, "album_name": data.album_name, 'download': data.audiodownload, 'track_id': data.id};
		qs('#controls').style.display = 'block';
		qs('#radio-control').style.display = 'none';
		changeDIV('now-listen');
		$('#section-title').text(_('now-listen'));
		startPlay();
	});
}
function getTop(top){
	params = top+'/?order={0}&limit={1}&imagesize=100'.format(getConf('top_orderby'), parseInt(getConf('top_limit')));
	getData(params, function(responseText) {
		data = responseText.results;
		$('#top-list').empty();
		for (i=0; i < data.length; i++){
			info = {};
			cover = '';
			if (data[i].album_image){
				cover = data[i].album_image;
			}else if (data[i].image){
				cover = data[i].image;
			}else{
				cover = 'img/no-image.png';
			}
			if (top == 'albums'){
				info = {id: data[i].id, cover: cover, name: data[i].name, artist: data[i].artist_name, type: 'album'}
			}else if (top == 'artists'){
				info = {id: data[i].id, cover: cover, name: null, artist: data[i].name, type: 'artist'}
			}else{
				top_tracks[i] = {"artist_name": data[i].artist_name, "track_name": data[i].name, "image": cover, "audio": data[i].audio, "album_name": data[i].album_name, 'download': data[i].audiodownload, 'track_id': data[i].id};
				info = {id: i, cover: cover, name: data[i].name, artist: data[i].artist_name, type: 'track'}
			}
			$('#top-list').append(tmpl('top_list_template',info));
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
	// News
	if (Object.keys(feed).length > 0){
		$('#news').empty();
		$.each(feed, function(key, value){
			$('#news').append(tmpl('feed', value));
		});
	}else{
		getData('feeds/', function(responseText) {
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
					data[i].text = data[i].text[lang];
				}else{
					data[i].text = data[i].text.en;
				}
				if (data[i].title[lang]){
					data[i].title = data[i].title[lang];
				}else{
					data[i].title = data[i].title.en;
				}
				if (data[i].subtitle.en && data[i].subtitle[lang]){
					data[i].subtitle = data[i].subtitle[lang];
				}else{
					data[i].subtitle = _(data[i].type);
				}
				if (data[i].type != "news"){
					data[i].link = "#";
				}
				feed[i] = data[i];
				$('#news').append(tmpl('feed', data[i]));
			}
		});
	}
}

function getArtistData(id){
	artist_id = id;
	changeDIV('artist-info')
	changeTab('artist-albums', ['artist-tracks', 'artist-albums']);

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
			info = {id: data.albums[i].id, cover: cover, name: null, artist: data.albums[i].name, type: null};
			$('#artist-albums').append(tmpl('top_list_template', info));
		}
		$('#artist_cover').attr('src', responseText.results[0].image);
	});
	getArtistTracks(id, function(data){
		i = 0;
		$('#artist-tracks ul').empty();
		$.each(data, function(key, value){
			cover = ''
			if (value.image){
				cover = value.image;
			}else{
				cover = 'img/no-image.png';
			}
			artist_tracks[i] = {"artist_name": value.artist_name, "track_name": value.track_name, "image": cover, "audio": value.audio, "album_name": value.album_name, 'track_id': value.track_id}
			info = {id: i, name: value.track_name};
			$('#artist-tracks ul').append(tmpl('playlist', info));
			i++;
		});
	});
}
$("#search-btn").click(function(e) {
	// Search
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
				info = {id: value.id, cover: image, name: null, artist: value.name, type: searchby}
				$('#search-results').append(tmpl('top_list_template', info));
			});
		});
	}
});

function getToken(url, type){
	// Get, or refresh, the Oauth token for access user data.
	if (type == 'new'){
		params = {'client_id': client_id, 'client_secret': client_secret, 'code': localStorage.code, 'grant_type': 'authorization_code', 'redirect_uri': url};
	}else if (type == 'refresh'){
		params = {'client_id': client_id, 'client_secret': client_secret, 'grant_type': 'refresh_token', 'refresh_token': localStorage.refresh_token};
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
			$('#btn-login').html('<i class="icon-logout"></i> '+_('logout')+'');
			localStorage.access_token = jsonp.access_token;
			localStorage.refresh_token = jsonp.refresh_token;
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
	if ( ! localStorage.access_token){
		var authWindow = window.open(OauthUrl);
		window.addEventListener('message', function(evt) {
			authWindow.close();
			localStorage.code = evt.data.code;
			getToken(url, 'new');
		});
	}else{
		getToken(url, 'refresh');
	}
}

function JamendoLogout(){
	// Logout from your Jamendo acoount.
	localStorage.username = '';
	localStorage.user_image = '';
	localStorage.code = ''
	localStorage.access_token = '';
	localStorage.refresh_token = '';
	$('#btn-login').html('<i class="icon-login"></i> '+_('login')+'');
}

function getUserData(){
	changeDIV('profile');
	if( $('#user-albums').is(':empty') ) {
		changeTab('user-albums', ['user-tracks', 'user-albums', 'user-artists', 'user-playlists']);
	}
	$('#section-title').text(_('profile'));
	$('#user-albums').empty();
	$('#user-tracks').empty();
	$('#user-artists').empty();
	getData('users/albums?access_token={0}&limit={1}'.format(localStorage.access_token, getConf('profile_limit')), function(responseText){
		if (responseText.headers.error_message == 'Jamendo Api Access Token Error: The access token provided has expired'){
			JamendoLogin();
			return false;
		}
		data = responseText.results[0];
		$('#user_img').attr('src', data.image);
		$('#username').text(data.dispname);
		for (i=0; i<data.albums.length; i++){
			cover = ''
			if (data.albums[i].image){
				cover = data.albums[i].image;
			}else{
				cover = 'img/no-image.png';
			}
			info = {id: data.albums[i].id, cover: cover, name: data.albums[i].name, artist: data.albums[i].artist_name, type: null};
			$('#user-albums').append(tmpl('top_list_template', info));
		}
	});
	getData('users/artists?access_token='+localStorage.access_token, function(responseText){
		data = responseText.results[0];
		for (i=0; i<data.artists.length; i++){
			cover = ''
			if (data.artists[i].image){
				cover = data.artists[i].image;
			}else{
				cover = 'img/no-image.png';
			}
			info = {id: data.artists[i].id, cover: cover, name: null, artist: data.artists[i].name, type: null};
			$('#user-artists').append(tmpl('top_list_template', info));
		}
	});
	getData('users/tracks?access_token='+localStorage.access_token, function(responseText){
		data = responseText.results[0];
		for (i=0; i<data.tracks.length; i++){
			cover = ''
			if (data.tracks[i].album_image){
				cover = data.tracks[i].album_image;
			}else{
				cover = 'img/no-image.png';
			}
			user_tracks[i] = {"artist_name": data.tracks[i].artist_name, "track_name": data.tracks[i].name, "image": cover, "audio": data.tracks[i].audio, "album_name":data.tracks[i].album_name, 'track_id': data.tracks[i].id}
			info = {id: data.tracks[i].id, cover: cover, name: data.tracks[i].name, artist: data.tracks[i].artist_name, type: null};
			$('#user-tracks').append(tmpl('top_list_template', info));
		}
	});
	getData('playlists/?access_token='+localStorage.access_token, function(responseText){
		data = responseText.results;
		$('#user-playlists ul').empty();
		$.each(data, function(key, value){
			$('#user-playlists ul').append(tmpl('playlist', value));
		});
	});
}

function share(web, type){
	msg = '';
	url = '';
	if (web != 'fav'){
	// Share now playing in social networks (Facebook, Twitter, G+, etc)
		if (type == 'now-listen' && playlist[currentTrack]){
			url = 'http://jamen.do/t/'+playlist[currentTrack].track_id;
			msg = getConf('share_track').format(playlist[currentTrack].track_name, playlist[currentTrack].artist_name);
		}else if (type == 'artist' && artist_id != 0){
			url = 'http://jamen.do/a/'+artist_id
			msg = getConf('share_artist').format($('#artist_name').text());
		}else if (type == 'album' && album_id != 0){
			url = 'http://jamen.do/l/a'+album_id;
			msg = getConf('share_album').format($('#album_name').text(), $('#album_artist').text());
		}else{
			return false;
		}
		if (web == 'twitter'){
			ShareUrl = 'http://twitter.com/intent/tweet?text='+encodeURIComponent(msg)+'&url='+url;
		}else if (web == 'facebook'){
			ShareUrl = 'http://www.facebook.com/sharer/sharer.php?u='+url;
		}else if (web == 'g+'){
			ShareUrl = 'https://plus.google.com/share?url='+url;
		}
		window.open(ShareUrl);
	}else{
		if(type == 'now-listen'){
			like();
		}
	}
}

document.addEventListener('DOMContentLoaded', function(){
	changeDIV('news');
	$("#news").delegate('a', 'click', function() {
		id = $(this).attr('id');
		type = $(this).attr('data-type');
		if (type == 'album'){
			getAlbum(id);
		}else if (type == 'playlist'){
			getPlaylist(id);
		}else if (type == 'artist'){
			getArtistData(id);
		}else if(type == 'news'){
			window.open($(this).attr('href'));
		}else{
			getArtistTracks(id, function(data){
				playlist = data;
			});
			changeDIV('now-listen');
		}
	});

	$('body').delegate('a[href="#"]', 'click', function(e){
		e.preventDefault();
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
			qs('#controls').style.display = 'block';
			qs('#radio-control').style.display = 'none';
			changeDIV('now-listen');
		}
	});

	$('#search-results').delegate('a', 'click', function(){
		id = $(this).attr('id');
		type = $(this).attr('data-type');
		if (type == 'albums'){
			getAlbum(id);
		}else if (type == 'tracks'){
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
		qs('#controls').style.display = 'block';
		qs('#radio-control').style.display = 'none';
		changeDIV('now-listen');
		startPlay();
	});
	$('#artist-albums, #user-albums').delegate('a', 'click', function(){
		$('#section-title').text(_('now-listen'));
		getAlbum(parseInt($(this).attr('id')));
	});

	$('#user-playlists ul').delegate('a', 'click', function(){
		id = $(this).attr('playlist-id');
		getPlaylist(id);
		$('#section-title').text(_('now-listen'));
		changeDIV('now-listen');
	});
	$('#album-tracks ul').delegate('a', 'click', function(){
		currentTrack = parseInt($(this).attr('data-album-track'));
		playlist = album_tracks;
		$('#section-title').text(_('now-listen'));
		changeDIV('now-listen');
		qs('#controls').style.display = 'block';
		qs('#radio-control').style.display = 'none';
		startPlay();
	});
});

$('#menu ul li a').click(function(){
	$('#menuLink').removeClass('active');
	$('#menu').removeClass('active');
	$('#layout').removeClass('active');
});

$('#main').click(function(){
	if ($('#menuLink').hasClass('active')){
		$('#menuLink').removeClass('active');
		$('#menu').removeClass('active');
		$('#layout').removeClass('active');
	}

});

$('#btn-now-listen').click(function () {
	changeDIV('now-listen');
	$('#section-title').text(_('now-listen'));
});

$('#btn-radios').click( function () {
	changeDIV('radios');
	$('#section-title').text(_('radios'));
	if( $('#radios').is(':empty') ) {
		getData('radios', function(responseText) {
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

$('#btn-artist-info').click( function () {
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
		$('i', this).removeClass('icon-play');
		$('i', this).addClass('icon-pause');
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
		$('i', this).removeClass('icon-pause')
		$('i', this).addClass('icon-play');
	}
});

$('#next').click( function () {
	if (player){
		nextTrack();
	}
});

$('#stop').click( function () {
	if (player){
		$('#play i').removeClass('icon-pause')
		$('#play i').addClass('icon-play');
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
	if ( ! localStorage.access_token){
		onError(_('no-logged'));
	}else{
		getUserData();
	}
});

$('#btn-login').click(function(){
	if (localStorage.access_token){
		JamendoLogout();
	}else{
		JamendoLogin();
	}
});


$('#btn-album-info').click( function () {
	$('#section-title').text(_('album-info'));
	changeDIV('album-info');
});

$('#artist-tabs .tab a').click(function(){
	tab = $(this).attr('data-tab');
	changeTab(tab, ['artist-tracks', 'artist-albums']);
});

$('#user-tabs .tab a').click(function(){
	tab = $(this).attr('data-tab');
	changeTab(tab, ['user-tracks', 'user-albums', 'user-artists', 'user-playlists']);
});

$('#album-tabs .tab a').click(function(){
	tab = $(this).attr('data-tab');
	changeTab(tab, ['album-tracks', 'album-reviews']);
});

$('.share_buttons a').click(function(){
	type =$(this).closest('div').attr('data-type');
	share($(this).attr('id'), type);
});
// Load and save configuration
$('#btn-config').click(function(){
	conf = JSON.parse(localStorage.config);
	if (localStorage.access_token){
		$('#btn-login').html('<i class="icon-logout"></i> '+_('logout'));
	}else{
		$('#btn-login').html('<i class="icon-login"></i> '+_('login'));
	}
	$('#section-title').text(_('config'));
	// Set values from config
	$("#config-form").find('input, select').each(function() {
		this.value = conf[this.id];
		if (this.id == 'show_notifications' || this.id == 'reviews_order_descent' || this.id == 'hasscore'){
			this.checked = conf[this.id];
		}
	});
	changeDIV('config');
});

$('#saveconf').click(function(e){
	e.preventDefault();
	conf = JSON.parse(localStorage.config);
	$("#config-form").find('input, select').each(function() {
		if (this.id != 'saveconf'){
			if (this.id == 'profile_limit' || this.id == 'top_limit'){
				if (this.value < 10 || this.value > 100){
					$(this).addClass('form_error');
					$(this).focus();
					onError(_('limit_error'));
					return false
				}else{
					conf[this.id] = this.value;
					$(this).removeClass('form_error');
				}
			}else if (this.id == 'show_notifications' || this.id == 'hasscore' || this.id == 'reviews_order_descent'){
				conf[this.id] = this.checked;
			}else{
				conf[this.id] = this.value;
			}
		}
		localStorage.setItem('config', JSON.stringify(conf));
	});
});

$('#clear-data').click(function(e){
	e.preventDefault();
	clear = confirm(_('clear-data-msg'));
	if (clear){
		localStorage.clear();
		localStorage.setItem('config', config);
		conf = JSON.parse(config);
		$("#config-form").find('input, select').each(function() {
			this.value = conf[this.id];
			if (this.id == 'show_notifications' || this.id == 'reviews_order_descent' || this.id == 'hasscore'){
				this.checked = conf[this.id];
			}
		});
	}
});

$('#user-artists').delegate('a', 'click', function(){
	getArtistData($(this).attr('id'));
	$('#section-title').text(_('artist'));
	changeDIV('artist-info');
	changeTab('artist-albums', ['artist-tracks', 'artist-albums']);
});

window.addEventListener('unload', function () {
	// For stop playing on app closed
	if (player){
		player.pause();
		player.src = '';
		player = null;
	}
});

// Simple JavaScript Templating
// John Resig - http://ejohn.org/ - MIT Licensed
(function(){
	var cache = {};

	this.tmpl = function tmpl(str, data){
	// Figure out if we're getting a template, or if we need to
	// load the template - and be sure to cache the result.
	var fn = !/\W/.test(str) ?
	cache[str] = cache[str] ||
	tmpl(document.getElementById(str).innerHTML) :

	// Generate a reusable function that will serve as a template
	// generator (and which will be cached).
	new Function("obj",
		"var p=[],print=function(){p.push.apply(p,arguments);};" +

		// Introduce the data as local variables using with(){}
		"with(obj){p.push('" +

		// Convert the template into pure JavaScript
		str
		.replace(/[\r\t\n]/g, " ")
		.split("<%").join("\t")
		.replace(/((^|%>)[^\t]*)'/g, "$1\r")
		.replace(/\t=(.*?)%>/g, "',$1,'")
		.split("\t").join("');")
		.split("%>").join("p.push('")
		.split("\r").join("\\'")
		+ "');}return p.join('');"
	);

	// Provide some basic currying to the user
	return data ? fn( data ) : fn;
	};
})();
