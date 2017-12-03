const express = require('express');
const router = express.Router();


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


module.exports = router;