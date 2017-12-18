const express = require('express');
const router = express.Router();
const CJ = require('../crawlerAPI/CJ');
const KPOST = require('../crawlerAPI/KPOST');


/* test routes for the clients to test connection and protocol/encoding/decoding */
router.get('/test', function(req, res, next) {
    if (req.query.querystring === undefined || req.query.querystring === null || req.query.querystring == "") {
        res.status(400); // bad request
        res.json({});
    }
    else {
        res.status(200);
        res.json( {querystring: req.query.querystring} );
    }
});

router.post('/test', function(req, res, next) {
    if (req.body.payload === undefined || req.body.payload === null || req.body.payload == "") {
        res.status(400);
        res.json({});
    }
    else {
        res.status(200);
        res.json( {payload: req.body.payload} );
    }
});

/* Service APIs */
router.get('/track', function(req, res, next) {

    // input verification
    if (req.query.trackingnum === undefined || req.query.trackingnum === null || req.query.trackingnum == "") {
        res.status(400); // bad request
        res.json( {success: false, errmsg: "TRACKING_NUMBER_REQUIRED"} );
    }
    else if (req.query.companycode === undefined || req.query.companycode === null || req.query.companycode == "") {
        res.status(400); // bad request
        res.json( {success: false, errmsg: "COMPANY_CODE_REQUIRED"} );
    }
    else if (req.query.companycode.toString() == "CJ") {
        CJ.CreateQueryPromise(req.query.trackingnum.toString())
        .then( ($) => { 
            let ret = CJ.TrackingDataToJSON($);
            res.status(200);

            if (!ret.success) {
                if (ret.errmsg.indexOf("운송장") > -1) {
                    res.status(400); // bad request
                    ret.errmsg = "TRACKING_NUMBER_INVALID";
                }
                else if(ret.errmsg.indexOf("서버") > -1) {
                    res.status(204); // unavailable
                    ret.errmsg = "PARCEL_SERVER_ERROR";
                }
                else{
                    res.status(418); // I'm a teapot! (RFC 2324)
                    ret.errmsg = "UNKNOWN_ERROR";
                }
            }
            res.json(ret);
        })
        .catch((err) => {
            res.status(204); // unavailable
            res.json({success: false, errmsg: "PARCEL_SERVER_ERROR"});
        });
    }
    else if (req.query.companycode.toString() == "KPOST") {
        KPOST.CreateQueryPromise(req.query.trackingnum.toString())
        .then( ($) => {
            let ret = KPOST.TrackingDataToJSON($);
            res.status(200);

            if (!ret.success) {
                if (ret.errmsg.indexOf("운송장") > -1) {
                    res.status(400); // bad request
                    ret.errmsg = "TRACKING_NUMBER_INVALID";
                }
                else if(ret.errmsg.indexOf("서버") > -1) {
                    res.status(204); // unavailable
                    ret.errmsg = "PARCEL_SERVER_ERROR";
                }
                else{
                    res.status(418); // I'm a teapot! (RFC 2324)
                    ret.errmsg = "UNKNOWN_ERROR";
                }
            }
            res.json(ret);
        })
        .catch((err) => {
            res.status(204); // unavailable
            res.json({success: false, errmsg: "PARCEL_SERVER_ERROR"});
        });
    }
    else {
        res.status(400); // bad request
        res.json({success: false, errmsg: "UNSUPPORTED_COMPANY_CODE"})
    }
});



module.exports = router;