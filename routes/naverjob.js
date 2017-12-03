const express = require('express');
const router = express.Router();


/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('naverjob', { title: '네이버 채용공고 알리미' });
});


module.exports = router;