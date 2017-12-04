// Web server
const express = require('express');
const http = require('http');
const path = require('path');
const logger = require('morgan');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');


// Routing
const index = require('./routes/index');
const delivery = require('./routes/delivery');
const naverjob = require('./routes/naverjob');

// Routing for internal logic
const query = require('./routes/query');
const service = require('./routes/service');


// Imports(modulized)
const packageNotifier = require('./packageNotifier');
const naverRecruitNotifer = require('./naverRecruitNotifier');

// instantiate express
const app = express();


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// middlewares
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false})); // extended false => querystring : false, qs library : true
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'))); //the folder "public" should have the resources ejs templates will be using(js, css..)

// website routing(requests)
app.use('/', index); // show main page (self intro)
app.use('/delivery', delivery);
app.use('/naverjob', naverjob);

// routing for internal logic
app.use('/query', query); // query API for internal usage
app.use('/service', service); //service API for public usage


packageNotifier(); // this server will now check for changes in package lists every 30 seconds
naverRecruitNotifer();


// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err,
            title : "Couldn't find the page :("
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {},
        title : "Couldn't find the page :("
    });
});

/**
 * Get port from environment and store in Express.
 */

//var port = normalizePort(process.env.PORT || '3000');
const port = 9000;
const ip = '172.31.5.224'; // private IP for the server to use with nginx
app.set('port', port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port, ip); // ip is optional, only for using with nginx
server.on('error', onError);
server.on('listening', onListening);

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
    console.log('Listening on ' + bind);
}
