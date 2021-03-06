var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var request = require('request');
var cookieParser = require('cookie-parser');
var session = require('express-session');

const VERIFY_TOKEN = Math.random().toString(36).substring(2);

app.set('port', process.env.PORT || 3000);
app.use(express.static(__dirname + '/styles'));
app.use(express.static(__dirname + '/scripts'));

app.use(cookieParser());
app.use(session({secret: process.env.SECRET}));

app.get('/', function(req, res) {
  if (req.session.access_token) {
    res.sendFile(__dirname + '/views/index.html');
  } else {
    res.redirect('https://api.instagram.com/oauth/authorize?client_id=' + process.env.INSTAGRAM_CLIENT_ID + '&redirect_uri=http://real-time-reel.herokuapp.com/auth&response_type=code');
  }
});

app.get('/auth', function(req, res) {
  req.session.access_token = req.query.code;
  res.redirect('/');
});

app.get('/images', function(req, res) {
  var url = process.env.INSTAGRAM_URL + '/tags/' + req.query.tag + '/media/recent?client_id=' + process.env.INSTAGRAM_CLIENT_ID;
  // var url = process.env.INSTAGRAM_URL + '/tags/' + req.query.tag + '/media/recent?access_token=' + req.session.access_token;
  if (req.query.minTagId) url += '&min_tag_id=' + req.query.minTagId;
  if (req.query.maxTagId) url += '&max_tag_id=' + req.query.maxTagId;
  request.get(url, (error, response, body) => error ? console.error('Error: ', error) : res.send(body));
});

app.get('/subscribe', function(req, res) {
  var formData = {
    object: 'tag',
    object_id: req.query.tag,
    aspect: 'media',
    callback_url: req.protocol + '://' + req.get('host') + '/callback',
    client_id: process.env.INSTAGRAM_CLIENT_ID,
    client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
    verify_token: VERIFY_TOKEN
  };

  request.post({
    url: process.env.INSTAGRAM_URL + '/subscriptions',
    formData: formData
  }, (error, response, body) => error ? res.send(err) : res.send(body));
});

app.get('/callback', function(req, res) {
  if (req.query['hub.mode'] == 'subscribe' && req.query['hub.verify_token'] === VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
  }
});

app.post('/callback', function(req, res) {
  body = '';
  req.on('data', function(d) {
    body += d;
  });
  req.on('end', function() {
    var response = JSON.parse(body)[0];
    io.emit('incoming', response);
  });
  res.end();
});

io.on('connection', function(socket) {
  socket.on('delete subscription', id => request.del(process.env.INSTAGRAM_URL + '/subscriptions?client_id=' + process.env.INSTAGRAM_CLIENT_ID + '&client_secret=' + process.env.INSTAGRAM_CLIENT_SECRET + '&id=' + id));
});

http.listen(app.get('port'), () => console.log('listening on *:' + app.get('port')));