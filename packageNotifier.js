// Package Aggregator
const CJ = require('./crawlerAPI/CJ');
const KPOST = require('./crawlerAPI/KPOST');

// Twilio SMS, MySQL, config
const twilio = require('twilio');
const mysql = require('mysql');
const config = require('./config');
/* config.js file structure
const config = {
    mysqlConfig : {
        host: "hosturl",
        user : "dbusername",
        password : "dbpassword",
        database : "databasename"
    },
    twConfig : {
        sid : "twiliosid",
        token : "twiliotoken"
    },
    captcha : "captchatoken"
}
*/

function PackageNotifier() {

    // ---- Twilio ---- //

    // instantiate twilio API
    const twclient = new twilio(config.twConfig.sid, config.twConfig.token);

    //sendSMS function
    function sendSMS(dest, msg){
        //send message
        twclient.messages.create({
            body: msg,
            to: '+82'+dest,
            from: '+12568184331'
        })
        .then((message) => console.log(message.sid))
        .catch( (e) => console.log("Error when sending SMS : ", e) );
    }

    // ---- DB connection ---- //

    // prepare to create connection
    const mysqlConfig = config.mysqlConfig;
    let connection;

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


    // ---- Main ---- //

    // always-looping service : check for updates for all pending delivery logs and notify if something changed.
    // limitation : If the user checks manually between the time of pause(30second max at current config) and the time of actual update from the parcel server, the update will not be fired because the DB has already been changed because of the user.
    function checkUpdate() {
        try{
            // TODO : consider npm promise-mysql
            connection.query("SELECT * FROM DeliveryLog WHERE status != '배달완료' AND noti = 'ON';", function (error, cursor) {
                if (error != null){
                    console.log("DB query failed:", error);
                }
                else{ // fetched all entries that are pending
                    let prevlog = {}; // { trackingnum: { companycode: XX, phonenum: XXX, history: string(json) }, trackingnum: {}... }
                    // for all entries, perform crawling.
                    for (let i = 0; i < cursor.length; ++i) {

                        // in prevlog, put in the current history at key "trackingnum" for comparison.
                        prevlog[cursor[i].trackingnum] = {}; // new object.
                        prevlog[cursor[i].trackingnum].companycode = cursor[i].companycode;
                        prevlog[cursor[i].trackingnum].phonenum = cursor[i].phonenum;
                        prevlog[cursor[i].trackingnum].history = JSON.parse(cursor[i].history);

                        if (cursor[i].companycode == "CJ") {
                            CJ.CreateQueryPromise(cursor[i].trackingnum)
                            .then( ($) => { 
                                let res = CJ.TrackingDataToJSON($);
                                if (res.success) {
                                    if (res.data.history.length != prevlog[res.data.trackingnum].history.length) {
                                        // something changed.
                                        let lastindex = res.data.history.length - 1;

                                        // Try updating the DB with new history, and if it succeeds, notify the user.
                                        connection.query("UPDATE DeliveryLog SET status=?, history=? WHERE trackingnum=?;",[res.data.status.toString(), JSON.stringify(res.data.history), res.data.trackingnum.toString()], function(err, cursor) {
                                            if (err != null) {
                                                // something went wrong. Don't notify the user yet.
                                            }
                                            else {
                                                // send notification to user, because there's no chance of duplicate update messages sending.
                                                try {
                                                    sendSMS(prevlog[res.data.trackingnum].phonenum, "택배 현황 업데이트 : " + res.data.history[lastindex].note);
                                                }
                                                catch (e) {
                                                    // twilio throws error when the user's phone is turned off
                                                    console.log("SMS failed");
                                                }
                                            }
                                        });
                                    }
                                }
                            })
                            .catch( (err) => { 
                                console.log("Something went wrong went trying to crawl update");
                            });
                        }
                        else if (cursor[i].companycode == "KPOST") {
                            KPOST.CreateQueryPromise(cursor[i].trackingnum)
                            .then( ($) => { 
                                let res = KPOST.TrackingDataToJSON($);
                                if (res.success) {
                                    if (res.data.history.length != prevlog[res.data.trackingnum].history.length) {
                                        // something changed.
                                        let lastindex = res.data.history.length - 1;

                                        // Try updating the DB with new history, and if it succeeds, notify the user.
                                        connection.query("UPDATE DeliveryLog SET status=?, history=? WHERE trackingnum=?;",[res.data.status.toString(), JSON.stringify(res.data.history), res.data.trackingnum.toString()], function(err, cursor) {
                                            if (err != null) {
                                                // something went wrong. Don't notify the user yet.
                                            }
                                            else {
                                                // send notification to user, because there's no chance of duplicate update messages sending.
                                                try {
                                                    sendSMS(prevlog[res.data.trackingnum].phonenum, "택배 현황 업데이트 : " + res.data.history[lastindex].note);
                                                }
                                                catch (e) {
                                                    console.log("SMS failed");
                                                }
                                            }
                                        });
                                    }
                                }
                            })
                            .catch( (err) => { 
                                console.log("Something went wrong went trying to crawl update");
                            });
                        }
                    }
                }
            });
        }
        catch(e) {
            console.log("Error when checking for updates");
            console.log(e);
        }
    }
    setInterval(checkUpdate, 30000);
}

module.exports = PackageNotifier;