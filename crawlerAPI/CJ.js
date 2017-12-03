const request = require('request-promise');
// iconv for decoding, cheerio for serverside DOM access. It's slightly different from jQuery - consider jQuery?
const iconv = require('iconv-lite');
const cheerio = require('cheerio');

class CJ {

    static GetBaseURL() {
        return "http://nplus.doortodoor.co.kr/web/detail.jsp";
    }

    // usage : CreateQueryPromise(tn).then(($)=>{});
    static CreateQueryPromise(trackingnum) {
        
        let qs = { slipno: trackingnum };
        let options = {
            uri: this.GetBaseURL(),
            qs: qs,
            encoding: null,
            transform: function (body) {
                // using transform option, return cheerio rather than the request object I guess?
                // CJ page is EUC-KR. Always look at headers first.
                return cheerio.load(iconv.decode(body,"EUC-KR")); 
            }
        };

        return request(options); // if .catch() is chained, CreateQueryPromise(tn).catch() won't be invoked.
    }

    static TrackingDataToJSON($) {
        // note : try/catch can only be used when it's synchronous code (of course)
        try { 
            
            let res = { 
                success: false, 
                /* data == {'trackingnum':string(int), 'sender':string, 'receiver':string, 'status':string, 
                             history:[ { 'date':'0000-00-00', 'time':'00:00', 'location':string, 'note':string }, { ... }, { ... } ]
                            }
                */
                data: { companycode: "CJ", trackingnum: "", sender: "", receiver: "", status: "", history: [] },
                errmsg: "" 
            };

            // if there's no such tracking number or the page didn't load correctly and can't even find default string "운송장"
            if($('table').eq(0).text().indexOf('미등록운송장') > -1 || $('table').eq(0).text().indexOf('운송장') < 0){
                res.success = false;
                res.errmsg = "본 송장번호는 미등록운송장입니다.";
                return res;
            }
            // else : there's a tracking number. Don't exit, and parse out the tracking number
            else {
                res.success = true;
                if ($('table').eq(0).text().match(/[0-9]+/i) != null) {
                    res.data.trackingnum = $('table').eq(0).text().match(/[0-9]+/i)[0]
                }
                if ($('table').eq(0).text().match(/\(.*\)/i) != null) {
                    res.data.status = $('table').eq(0).text().match(/\(.*\)/i)[0].replace(/[()]/g,"");
                }
            }

            let basic = $('table').eq(2).children('tbody').children('tr').eq(1).children('td');
            res.data.sender = basic.eq(0).text();
            res.data.receiver = basic.eq(1).text();

            // if there's a query result
            $('table').eq(6).children('tbody').children('tr').each((index, elem) => {
                if (index > 0){
                    let phonenum = "";
                    // regex below matches numbers and/or dashes inside brackets. However, there needs to be at least one number, and preceding may or may not with numbers/dashes/whitespace.
                    // (-1800-8000) : match
                    // (18008000) : match
                    // ( - 1800 - 8000) : match
                    // (- -) : doesn't match
                    if ($(elem).find('table td').eq(1).text().match(/\([ -]*[0-9]+[ 0-9-]*\)/i) != null) {
                        phonenum += "<br>" + $(elem).find('table td').eq(1).text().match(/\([ -]*[0-9]+[ 0-9-]*\)/i)[0];
                    }

                    let td =$(elem).children('td');
                    // CJ's history is most recent to front(top) of table. Let's reverse that.
                    // Also, time and date sometimes has whitespace issues. we'll cut that.
                    res.data.history.unshift({date:td.eq(0).text().match(/[0-9].*[0-9]/i)[0], time: td.eq(1).text().match(/[0-9]+:[0-9]+/i)[0], location: $(elem).find('table td').eq(0).text() + phonenum, note: td.eq(3).text()});
                    
                }
            });

            // slightly different from jquery. cannot access/iterate by index. $('td').eq(0) works, though.
            return res;
        }
        catch(err) { // in case the server was down, and things broke when accessing dom elements
            console.log(err);
            let res = { success: false, data: [], err: err, errmsg: "CJ 배송서버가 다운되었습니다." };
            return res;
        }
    }
    static ErrorHandler(err) {
        console.log("Something went wrong : " + err);
    }
}

module.exports = CJ;