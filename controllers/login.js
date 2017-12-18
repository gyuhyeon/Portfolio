var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('login', { title: '배송조회 서비스' });
});
router.post('/signin', function(req, res, next) {
    res.json({result:'success'}); //placeholder, always returns true right now
});
router.post('/signup', function(req, res, next){
    res.json({result:'success'}); //placeholder
});

module.exports = router;
