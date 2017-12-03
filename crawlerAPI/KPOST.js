const request = require('request-promise');
// iconv for decoding, cheerio for serverside DOM access. It's slightly different from jQuery - consider jQuery?
const iconv = require('iconv-lite');
const cheerio = require('cheerio');

class KPOST {

    static GetBaseURL() {
        return "https://service.epost.go.kr/trace.RetrieveDomRigiTraceList.comm";
    }

    // usage : CreateQueryPromise(tn).then(($)=>{});
    static CreateQueryPromise(trackingnum) {

        let qs = { sid1: trackingnum, displayHeader: "N" };
        let options = {
            uri: this.GetBaseURL(),
            qs: qs,
            encoding: null,
            transform: function (body) {
                // using transform option, return cheerio rather than the request object I guess?
                // KPOST page is utf-8 encoded
                return cheerio.load(iconv.decode(body, "utf-8")); 
            }
        };
        return request(options); // if .catch() is chained, CreateQueryPromise(tn).catch() won't be invoked.
    }

    static TrackingDataToJSON($) {

        try {
            let res = { 
                success: false, 
                /* data == {'trackingnum':string(int), 'sender':string, 'receiver':string, 'status':string, 
                             history:[ { 'date':'0000-00-00', 'time':'00:00', 'location':string, 'note':string }, { ... }, { ... } ]
                            }
                */
                data: { companycode: "KPOST", trackingnum: "", sender: "", receiver: "", status: "", history: [] },
                errmsg: "" 
            };
            let page = $('#print').eq(0); // div id="print" that wraps the whole page
            let basic = page.children('table.table_col').eq(0); // basic info table
            let detail = page.children('div.ma_t_5').eq(0).find('table.table_col').eq(0); // detailed history table

            //basic info table header data(safe when none returned)
            /* header data is unnecessary because it's standardized
            basic.find('thead > tr > th')
                .each((index, elem) => { // $(this) == $(elem)
                    data.basic.th.push($(elem).text());
            });
            */

            //basic info table body data(trackingnumber is in th for some reason)(safe when none returned)
            res.data.trackingnum = basic.find('tbody > tr > th').eq(0).text();
            let basictbody = basic.find('tbody > tr > td');
            res.data.sender = basictbody.eq(0).text().replace(/[ \n]*[0-9]+\.[0-9]+\.[0-9]+/i, "");
            res.data.receiver = basictbody.eq(1).text().replace(/[ \n]*[0-9]+\.[0-9]+\.[0-9]+/i, "");
            res.data.status = basictbody.eq(3).text();

            //if the data is only consisted of whitespace and/or newline
            console.log("Testing : 받는이 will be : [" + res.data.sender + "] when empty"); // dev
            if (res.data.sender.length == 0 || res.data.sender == "" || res.data.sender.match(/[ \n]*/i) == res.data.sender.match(/[ \n]*/i).input){
                res.success = false;
                res.errmsg = "본 송장번호는 미등록운송장입니다.";
                return res;
            }
            else{
                res.success = true;
            }

            /*
            //detail info table header data
            detail.find('thead > tr > th')
                .each((index, elem) => {
                    data.detail.th.push($(elem).text());
            });
            */

            //detail info table body data
            detail.find('tbody > tr')
                .each((index, elem) => {
                    let td = $(elem).children('td');
                    res.data.history.push({ date: td.eq(0).text().replace(/[.]/g, "-"), time: td.eq(1).text(), location: td.eq(2).text(), note :td.eq(3).text()});
                });
            
            //slightly different from jquery. cannot access/iterate by index. $('td').eq(0) works, though.
            return res;
        }
        catch(err) { //in case the server was down, and things broke when accessing dom elements
            let res = { success: false, data: [], err: err, errmsg: "우체국 배송서버가 다운되었습니다."};
            return res;
        }
    }
    static ErrorHandler(err) {
        console.log("Something went wrong : " + err);
    }
}

module.exports = KPOST;