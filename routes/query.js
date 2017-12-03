const express = require('express');
const router = express.Router();
const request = require('request-promise');

const mysql = require('mysql');
const CJ = require('../crawlerAPI/CJ');
const KPOST = require('../crawlerAPI/KPOST');
const config = require('../config');


// prepare to create connection
const mysqlConfig = config.mysqlConfig;
let connection;

//handleDisconnect keeps the mysql connection alive for this route
function handleDisconnect(){
    connection = mysql.createConnection(mysqlConfig);
    connection.connect(function(err){
        if(err){
            console.log("error connecting to db: ", err);
            setTimeout(handleDisconnect, 2000); // if connection was refused, try again in 2 seconds.
        }
    });
    connection.on('error', function(err){
        console.log('db error', err);
        if(err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNREFUSED'){
            handleDisconnect(); // connection lost to db. try connecting again.
        }
        else{
            //throw err;
        }
    });
}
handleDisconnect();


router.get('/', function(req, res, next) {

    let isnotify = false;
    if (req.query.phonenum.match(/^[0-1]{3}[-]*[0-9]{4}[-]*[0-9]{4}$/i) != null) {
        isnotify = true;
    }
    if ( isnotify == true && (req.query.recaptcharesponse === undefined || req.query.recaptcharesponse === '' || req.query.recaptcharesponse === null)) {
        return res.json({success: false, errmsg : "알림을 받으시려면 캡챠를 완성해주세요."});
    }
    
    // input verification
    if (req.query.trackingnum === undefined || req.query.trackingnum === null || req.query.trackingnum == "") {
        res.json( {success: false, errmsg: "송장번호 미입력"} );
    }
    else if (req.query.companycode === undefined || req.query.companycode === null || req.query.companycode == "") {
        res.json( {success: false, errmsg: "택배사 미선택"} );
    }
    else if (isnotify == true){
        let form = { secret : config.captcha, response : req.query.recaptcharesponse };
        let options = {
            method: "POST",
            uri: "https://www.google.com/recaptcha/api/siteverify",
            formData: {
                secret: form.secret,
                response: form.response
            }
        };
        request(options).then((body) => {
            //console.log(body);
            if (body.success !== undefined && !body.success) {
                res.json( { success: false, errmsg: "캡챠가 실패하였습니다. 다시 시도해주세요." } );
            }
            else{ // success. go as planned.
                if (req.query.companycode == "CJ") {
                    CJ.CreateQueryPromise(req.query.trackingnum)
                    .then( ($) => { 
                        let ret = CJ.TrackingDataToJSON($);
                        if(!ret.success){
                            //something went wrong when querying.
                            res.json(ret);
                        }
                        else{
                            connection.query('SELECT * FROM DeliveryLog WHERE trackingnum=?;', [ret.data.trackingnum.toString()], function(error, cursor){
                                if(error != null){
                                    console.log("Error when fetching from DB - internal error");
                                }
                                else{
                                    if(cursor.length > 0){
                                        connection.query("UPDATE DeliveryLog SET status=?, history=?, noti=?, phonenum=? WHERE trackingnum=?;", [ret.data.status.toString(), JSON.stringify(ret.data.history), "ON", req.query.phonenum.toString(), ret.data.trackingnum.toString()], function(err, cur){
                                            if(err != null){
                                                console.log("Error when fetching from DB - internal error");
                                                console.log(err);
                                                res.json( { success:false, errmsg:"조회중 문제가 발생하였습니다." } );
                                            }
                                            else{
                                                res.json(ret);
                                            }
                                        });
                                    }
                                    else{
                                        connection.query("INSERT INTO DeliveryLog(companycode, trackingnum, sender, receiver, status, history, noti, phonenum) VALUES(?,?,?,?,?,?,?,?);", [ret.data.companycode.toString(), ret.data.trackingnum.toString(), ret.data.sender.toString(), ret.data.receiver.toString(), ret.data.status.toString(), JSON.stringify(ret.data.history), "ON", req.query.phonenum.toString()], function(err, cur){
                                            if(err != null){
                                                console.log("Error when fetching from DB - internal error");
                                                console.log(err);
                                                res.json( { success:false, errmsg:"조회중 문제가 발생하였습니다." } );
                                            }
                                            else{
                                                res.json(ret);
                                            }
                                        });
                                    }
                                }
                            });
                        }
                    })
                    .catch( (err) => { res.json({success:false, errmsg:err})} );
                }
                else if (req.query.companycode == "KPOST") {
                    KPOST.CreateQueryPromise(req.query.trackingnum)
                    .then( ($) => { 
                        let ret = KPOST.TrackingDataToJSON($);
                        if(!ret.success){
                            //something went wrong when querying.
                            res.json(ret);
                        }
                        else{
                            connection.query('SELECT * FROM DeliveryLog WHERE trackingnum=?;', [ret.data.trackingnum.toString()], function(error, cursor){
                                if(error != null){
                                    console.log("Error when fetching from DB - internal error");
                                }
                                else{
                                    console.log(cursor.length);
                                    if(cursor.length > 0){
                                        connection.query("UPDATE DeliveryLog SET status=?, history=?, noti=?, phonenum=? WHERE trackingnum=?;", [ret.data.status.toString(), JSON.stringify(ret.data.history), "ON", req.query.phonenum.toString(), ret.data.trackingnum.toString()], function(err, cur){
                                            if(err != null){
                                                console.log("Error when fetching from DB - internal error");
                                                console.log(err);
                                                res.json( { success:false, errmsg:"조회중 문제가 발생하였습니다." } );
                                            }
                                            else{
                                                res.json(ret);
                                            }
                                        });
                                    }
                                    else{
                                        connection.query("INSERT INTO DeliveryLog(companycode, trackingnum, sender, receiver, status, history, noti, phonenum) VALUES(?,?,?,?,?,?,?,?);", [ret.data.companycode.toString(), ret.data.trackingnum.toString(), ret.data.sender.toString(), ret.data.receiver.toString(), ret.data.status.toString(), JSON.stringify(ret.data.history), "ON", req.query.phonenum.toString()], function(err, cur){
                                            if(err != null){
                                                console.log("Error when fetching from DB - internal error");
                                                console.log(err);
                                                res.json( { success:false, errmsg:"조회중 문제가 발생하였습니다." } );
                                            }
                                            else{
                                                res.json(ret);
                                            }
                                        });
                                    }
                                }
                            });
                        }
                    })
                    .catch( (err) => { res.json({success:false, errmsg:err})} );
                }
                else if (req.query.companycode=="LOGEN") {
                    res.json( { success:false, errmsg:"로젠택배 구현중" } );
                }
                else{
                    res.json( { success:false, errmsg:"해당 택배사는 구현계획이 없습니다." } );
                }
            }
        });
    }
    else { // normal user input
        if (req.query.companycode == "CJ") {
            CJ.CreateQueryPromise(req.query.trackingnum)
            .then( ($) => { 
                res.json(CJ.TrackingDataToJSON($));
            })
            .catch( (err) => { res.json({success:false, errmsg:err})} );
        }
        else if (req.query.companycode == "KPOST") {
            KPOST.CreateQueryPromise(req.query.trackingnum)
            .then( ($) => { 
                res.json(KPOST.TrackingDataToJSON($));
            })
            .catch( (err) => { res.json({success:false, errmsg:err})} );
        }
        else if (req.query.companycode=="LOGEN") {
            res.json( { success:false, errmsg:"로젠택배 구현중" } );
        }
        else{
            res.json( { success:false, errmsg:"해당 택배사는 구현계획이 없습니다." } );
        }
    }
});

module.exports = router;