const express = require('express');
const router = express.Router();


/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('delivery', { title: '배송조회 서비스' });
});


module.exports = router;