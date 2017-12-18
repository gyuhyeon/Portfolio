const express = require('express');
const router = express.Router();



// Web routing
const delivery = require('./delivery');
const naverjob = require('./naverjob');

// Routing for internal logic
const query = require('./query');
const service = require('./service');



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
router.use('/delivery', delivery);
router.use('/naverjob', naverjob);

// Routing for internal logic
router.use('/query', query); // query API for internal usage
router.use('/service', service); //service API for public usage



module.exports = router;