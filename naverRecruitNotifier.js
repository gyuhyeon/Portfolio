
const request = require('request');
const rp = require('request-promise'); // TODO : change request to request-promise
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

function naverRecruitNotifier() {

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

    // ---- Twilio ---- //
    
    // instantiate twilio API
    const twclient = new twilio(config.twConfig.sid, config.twConfig.token);
    
    //sendSMS
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

    function sendNotification(msg = '채용 공고가 업데이트 되었습니다.'){
        connection.query('SELECT * FROM `NotifyList`', function(error, cursor){
            var notifylist=[];
            if(error==null){
                for(var i=0; i<cursor.length; i++){
                    notifylist.push(cursor[i].phonenumber);
                }
            }
            else{
                console.log(error);
                return; //end the query and its future processing to prevent weird behaviors when db is inaccessible
            }
            for(var i=0; i<notifylist.length && i<30; ++i){ //limit list to 30 to prevent going bankrupt...
                sendSMS(notifylist[i], msg);
            }
        }); //end of connection.query
    }

    // ---- Main update code ---- //
    //test once when server starts running
    //sendSMS("010-7248-1535", "Twilio operational :)");
    //SMS test disabled to prevent latenight spam at 5AM..
    function checkUpdate(){
        try {
            connection.query('SELECT * FROM `NaverJobs`', function(error, cursor){
                var prevjoblist = [];
                if(error==null){
                    for(var i=0; i<cursor.length; i++){
                        prevjoblist.push(cursor[i].jobTitle);
                    }
                }
                else{
                    console.log(error);
                    return; //end the query and its future processing to prevent spamming when db is inaccessible
                }
                
                var PAGE_ENCODING = 'utf-8'; // change to match page encoding
                
                function parse(url, position_type, prevjoblist) {
                    /* uh... the website is javascript rendered.. *sigh* basically, we have to use post requests instead
                    (function(prevjoblist){
                        request({
                            url: url,
                            encoding: null  // do not interpret content yet
                        }, function (error, response, body) {
                            var joblist = [];
                            var $ = cheerio.load(iconv.decode(body, PAGE_ENCODING));
                            
                            
                            $('.card_list > ul > li > a > span > strong').each(function(){
                                if(prevjoblist.indexOf($(this).text()) == -1){ //indexOf returns -1 if not found in list
                                    joblist.push(position_type + $(this).text());
                                    connection.query('INSERT INTO `NaverJobs`(jobTitle) VALUES ("' + $(this).text() + '");');
                                }
                            });
                            
                            if(joblist.length>0){
                                sendNotification(position_type.slice(0,2)+" 공고가 업데이트 되었습니다.");
                            }
                        });//end of request
                    })(prevjoblist);//IIFE to pass prevjoblist from query to a request callback to check for prev states
                    //BTW, IIFE is actually not needed for accessing global scopes in this manner...
                    */
                    request.post({url:url}, function(error, response, body) {
                        let jsondata = JSON.parse(body); //FIXME : jsondata will be corrupt if Naver fails to respond accordingly(seems to happen around 5AM, which is probably causing the crash).
                        let joblist = [];
                        let insertdata = []; // array to insert into db(new jobs)
                        for(var i = 0; i < jsondata.length; ++i) {
                            if(prevjoblist.indexOf(position_type + jsondata[i].jobNm)==-1){
                                joblist.push(jsondata[i].jobNm);
                                insertdata.push(position_type + jsondata[i].jobNm);
                            }
                        }
                        if(insertdata.length>0) {
                            connection.query('INSERT INTO `NaverJobs`(jobTitle) VALUES (?);',insertdata);
                        }
                        if(joblist.length>0) {
                            var text=joblist[0];
                            if(joblist.length>1) {
                                text+=" 외 "+(joblist.length-1)+"건";
                            }
                            sendNotification(position_type.slice(0,2)+" 공고가 업데이트 되었습니다: "+text+" / 구독취소:gyuhyeonlee.com");
                            // LINE bot push messages
                            connection.query('SELECT FROM `NaverJobs`.`LineFriends` WHERE `id`=?;', function(error, cursor) {
                                if(error==null){
                                    for (let i = 0; i < cursor.length; ++i) {
                                        let options = {
                                            method: "POST",
                                            uri: "https://api.line.me/v2/bot/message/multicast",
                                            headers: {
                                                'Content-Type':'application/json',
                                                'Authorization':'Bearer {'+config.linetoken+'}'
                                            },
                                            body: {
                                                to : [cursor[i].id],
                                                messages: [{"type":"text", "text": position_type.slice(0,2)+" 공고가 업데이트 되었습니다: "+text}]
                                            },
                                            json: true
                                        };
                                        rp(options);
                                    }
                                }
                            });
                        }
                    });
                    
                    
        
                }//end of parse function definition
                
                //full-time positions
                parse('https://recruit.navercorp.com/naver/job/listJson?classNm=developer&entTypeCd=001&searchTxt=&startNum=0&endNum=50', "신입_", prevjoblist);
                //internship positions
                parse('https://recruit.navercorp.com/naver/job/listJson?classNm=developer&entTypeCd=004&searchTxt=&startNum=0&endNum=50', "인턴_", prevjoblist);
                //transfer positions(testing purposes)
                parse('https://recruit.navercorp.com/naver/job/listJson?classNm=developer&entTypeCd=002&searchTxt=&startNum=0&endNum=50', "경력_", prevjoblist);
                
            });
        }
        catch (e) {
            console.log("Error : ", e); // don't make this function crash the server, since it's called every 30 seconds.
        }
    }
    setInterval(checkUpdate, 30000);

}

module.exports = naverRecruitNotifier; // we don't really need to do this. call PackageNotifier() below, and "require()" this file where it needs to run in the main code.