const express = require('express');
const router = express.Router();

const request = require('request');
const config = require('../config');

const mysql = require('mysql');
const mysqlConfig = config.mysqlConfig;
let connection;

// instantiate twilio API
const twilio = require('twilio');
const twclient = new twilio(config.twConfig.sid, config.twConfig.token);

//handleDisconnect keeps the mysql connection alive for this route
function handleDisconnect() {
    connection = mysql.createConnection(mysqlConfig);
    connection.connect(function(err) {
        if(err){
                console.log("error connecting to db: ", err);
                setTimeout(handleDisconnect, 2000); // if connection was refused, try again in 2 seconds.
            }
        });
    connection.on('error', function(err) {
        console.log('db error', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNREFUSED') {
            handleDisconnect(); // connection lost to db. try connecting again.
        }
        else {
            //throw err;
        }
    });
}
handleDisconnect();

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('naverjob', { title: '네이버 채용공고 알리미' });
});


router.post('/enlist', function(req, res, next) {
    if(req.body['g-recaptcha-response'] === undefined || req.body['g-recaptcha-response'] === '' || req.body['g-recaptcha-response'] === null) {
        return res.json({"response" : "Please complete recaptcha."});
    }
    var regex = /^\d{3}[-]?\d{4}[-]?\d{4}$/;
    if(!req.body.phonenumber.match(regex)){
        return res.json({"response" : "Please input a correct phone number. (000-0000-0000)"});
    }
    request.post({url:"https://www.google.com/recaptcha/api/siteverify", form:{"secret" : config.captcha, "response" : req.body['g-recaptcha-response']}}, function(error, response, body){
        body = JSON.parse(body);
        // Success will be true or false depending upon captcha validation.
        if(body.success !== undefined && !body.success) {
            return res.json({"response" : "Recaptcha validation failed, please try again."})
        }
        //everything OK, now we add the phone number to the DB.
        connection.query('INSERT INTO `NotifyList`(phonenumber) VALUES(?);',[req.body.phonenumber.replace(/-/g,'')], function(error, cursor){
            if(error==null){
                twclient.messages.create({
                    body: "Welcome to Naver job opening notification service!"+" / 구독취소:gyuhyeonlee.com",
                    to: '+82'+req.body.phonenumber,
                    from: '+12568184331'
                })
                .then((message) => console.log(message.sid));
                return res.json({"response" : "Success! Please wait for confirmation SMS."});
            }
            else{
                return res.json({"response" : "We're sorry, but either our DB is not working, or you're already subscribed!"});
            }
        }); //end of insert connection.query

    }); //end of request.post (sorry for callback hell!)
}) //end of router post handling

router.post('/unsubscribe', function(req, res, next) {
    if(req.body['g-recaptcha-response'] === undefined || req.body['g-recaptcha-response'] === '' || req.body['g-recaptcha-response'] === null) {
        return res.json({"response" : "Please complete recaptcha."});
    }
    var regex = /^\d{3}[-]?\d{4}[-]?\d{4}$/;
    if(!req.body.phonenumber.match(regex)){
        return res.json({"response" : "Please input a correct phone number. (000-0000-0000)"});
    }
    request.post({url:"https://www.google.com/recaptcha/api/siteverify", form:{"secret" : config.captcha, "response" : req.body['g-recaptcha-response']}}, function(error, response, body){
        body = JSON.parse(body);
        // Success will be true or false depending upon captcha validation.
        if(body.success !== undefined && !body.success) {
            return res.json({"response" : "Recaptcha validation failed, please try again."})
        }
        //everything OK, now we add the phone number to the DB.
        connection.query('DELETE FROM `NaverJobs`.`NotifyList` WHERE `phonenumber`=?;',[req.body.phonenumber.replace(/-/g,'')], function(error, cursor){
            if(error==null){
                if(cursor.affectedRows>0){
                    return res.json({"response" : "Success! Your number has been deleted."});
                }
                else{
                    return res.json({"response" : "Your number is not in the database!"});
                }
            }
            else{
                return res.json({"response" : "We're sorry, our DB seems to be down right now..."});
            }
        }); //end of insert connection.query

    }); //end of request.post (sorry for callback hell!)
});


module.exports = router;