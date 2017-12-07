const express = require('express');
const router = express.Router();

const request = require('request');
const rp = require('request-promise'); //TODO : change current request dependency in code into request-promise
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


// line webhook for receiving sub&unsub events.
router.post('/lineevents', function(req, res, next) {
    let insertvalues = [];
    let removevalues = [];
    if(req.body.events!==null && req.body.events!==undefined){
        for (let i = 0; i < req.body.events.length; ++i) {
            if (req.body.events[i].type == 'follow') {
                insertvalues.push(req.body.events[i].source.userId);
            }
            else if(req.body.events[i].type == 'unfollow') {
                removevalues.push(req.body.events[i].source.userId);
            }
        }
        if (insertvalues.length > 0) {
            // don't really care about data consistency. All we need make sure is that removing takes priority over adding.
            connection.query('INSERT INTO `NaverJobs`.`LineFriends`(id) VALUES (?);', insertvalues, function(error, cursor){
                if(error == null){
                    let options = {
                        method: "POST",
                        uri: "https://api.line.me/v2/bot/message/multicast",
                        headers: {
                            'Content-Type':'application/json',
                            'Authorization':'Bearer {'+config.linetoken+'}'
                        },
                        body: {
                            messages: [{"type":"text", "text": "구독 신청 감사합니다! 변경사항이 있을 경우 바로 알려드릴게요 :)"}]
                        }
                    };
                    rp(options); // one way request, don't really need .then() promises. Send greetings to new users.
                }
                else{
                    console.log("DB error : "+error);
                }
                if (removevalues.length > 0) {
                    connection.query('DELETE FROM `NaverJobs`.`LineFriends` WHERE `id`=?;', removevalues, function(error){
                        if(error != null){
                            console.log("DB error : "+error);
                        }
                    });
                }
            });
        }
    }
    res.set('Content-Type', 'text/plain');
    res.send("Thanks LINE!");
});


module.exports = router;