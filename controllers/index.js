const express = require('express');
const router = express.Router();



// Web routing
//const delivery = require('./delivery');

// Routing for internal logic
//const query = require('./query');



/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', { title: 'Hello!' });
});
router.get('/index', function(req, res, next) {
    res.render('index', { title: 'Hello!' });
});
router.get('/index.html', function(req, res, next) {
    res.render('index', { title: 'Hello!' });
});



/* Other routes */
// Web routing
//router.use('/delivery', delivery);

// Routing for internal logic
//router.use('/query', query); // query API for internal usage



module.exports = router;