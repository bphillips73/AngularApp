var express = require('express');
var app = express();
var bodyParser = require('body-parser')
var morgan = require('morgan');
var path = require('path');
var config = require('./config/configs');
var debug = require('debug')('workspace:server');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var _ = require('lodash');



app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(function(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, content-type, Authorization');
  next();
});



app.use(morgan('dev'));
app.use('/css', express.static('public/css'));
app.use('/js', express.static('public/js'));
app.use('/views', express.static('public/views'));
/*app.use('/lib', intercept,express.static(__dirname+ '../node_modules'));*/
app.use('/lib', intercept, express.static('public/bower_components'));
function intercept(req,res,next){
	console.log('the lib route is being requested');
	next();
}


app.get('/*', function (req, res) {
  console.log('only the index file is being returned');
  res.sendFile('./index.html',{ root: path.join(__dirname, '../public/views') });
})


var port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

/**
 * Create HTTP server.
 */

var server = http;

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);



var users = [];
// Socket io connection, 
// for real time server

io.on('connection', function(socket){
	console.log('somebody connected: ',socket.id);
  socket.join('#General');
  console.log('all current clients',Object.keys(io.engine.clients));
  

  socket.on('presence',function(){
      console.log('requested presence')
      var data ={
        list:users
      }
      io.to('#General').emit('presence-return',data);
  })

  socket.on('chat', function(data){
    console.log('new chat was sent', data);

    
    io.to('#General').emit('newchat',data);
  })

  socket.on('private', function(data){
    console.log('private message sent');
    if(data.userid){
      io.broadcast.to(data.userid).emit('private-chat',data);
    }
    else{
      io.to(socket.id).emit('error-alert',{data:'Private chat failed!'});
    }
  })

  socket.on('login', function(data){
    console.log('new user logged in');

    socket.username = data.data.username;
    socket.profileimage = data.data.imagesrc;
    if(socket.id){
      let userObj = {};
      userObj.socketid = socket.id;
      userObj.room = '#General';
      userObj.username = socket.username;
      userObj.profileimage = socket.profileimage || 'http://placehold.it/140x100';
      users.push(userObj);
      var data ={
        list:users
      }
      io.to('#General').emit('presence-return',data);
    }

  })

  socket.on('leave',function(){
    console.log('some exited');
    socket.leave();
  })

  socket.on('disconnect', function(socket){
    console.log('there was a disconnect ', socket);
      let list = [];
      for(var i= 0; i<users.length; i++){
        if(users[i].socketid in io.engine.clients){
          list.push(users[i]);
        }
      }
      var data ={
        list:list
      }
      io.to('#General').emit('presence-return',data);
    }) 
   
})





/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}