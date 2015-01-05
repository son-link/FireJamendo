var express = require('express'),
    app = express();

var CLIENT_ID = '795e43fd';
var CLIENT_SECRET = ''e82c69ed561875cbad2868b209551b4c''

var oauth2 = require('simple-oauth2')({
  clientID: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  site: 'https://api.jamendo.com/v3.0/oauth/authorize',
  tokenPath: '/v3.0/oauth/grant'
});

// Authorization uri definition
var authorization_uri = oauth2.authCode.authorizeURL({
  redirect_uri: 'http://localhost:3000/redirect.html',
  scope: 'notifications',
  state: '3(#0/!~'
});

// Initial page redirecting to Github
app.get('/auth', function (req, res) {
    res.redirect(authorization_uri);
});

// Callback service parsing the authorization token and asking for the access token
app.get('/callback', function (req, res) {
  var code = req.query.code;
  console.log('/callback');
  oauth2.authCode.getToken({
    code: code,
    redirect_uri: 'http://localhost:3000/redirect.html'
  }, saveToken);

  function saveToken(error, result) {
    if (error) { console.log('Access Token Error', error.message); }
    token = oauth2.accessToken.create(result);
  }
});

app.get('/', function (req, res) {
  res.send('Hello<br><a href="/auth">Log in with Jamendo</a>');
});

app.listen(3000);

console.log('Express server started on port 3000');
