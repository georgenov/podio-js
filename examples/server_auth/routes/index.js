var express = require('express');
var router = express.Router();
var PodioJS = require('../../../lib/podio-js');
var sessionStore = require('../sessionStore');
var Busboy = require("busboy");
var temp = require('temp');
var fs = require('fs');

var clientId = 'marc-test';      // your clientId here
var clientSecret = 'IXdBmtpq43jnV0xbWKszDc9vSjqAyROYeFrVjcnMnLO0c0ymHBDF0aRJZmFY5Gn8'   // your clientSecret here;
var podio = new PodioJS({ authType: 'server', clientId: clientId, clientSecret: clientSecret }, { sessionStore: sessionStore });

function getFullURL(req) {
  return req.protocol + '://' + req.get('host') + '/';
}

/* GET home page. */
router.get('/', function(req, res) {
  var authCode = req.query.code;
  var errorCode = req.query.error;
  var redirectURL = getFullURL(req);

  podio.isAuthenticated()
  .then(function () {
    // ready to make API calls
    res.render('success');
  }).catch(function () {

    if (typeof authCode !== 'undefined') {
      podio.getAccessToken(authCode, redirectURL, function (err) {
        // we are ready to make API calls
        res.render('success');
      });
    } else if (typeof errorCode !== 'undefined') {
      // an error occured
      res.render('error', { description: req.query.error_description });
    } else {
      // we have neither an authCode nor have we authenticated before
      res.render('index', { authUrl: podio.getAuthorizationURL(redirectURL) });
    }
  });
});

router.get('/user', function(req, res) {
 
  podio.isAuthenticated()
  .then(function() {
    return podio.request('get', '/user/status');
  })
  .then(function(responseData) {
    res.render('user', { profile: responseData.profile });    
  })
  .catch(function(err) {
    res.send(401);
  });
});

router.get('/upload', function(req, res) {
  res.render('upload');
});

router.post('/upload', function(req, res) {
  var busboy = new Busboy({ headers: req.headers });

  podio.isAuthenticated()
  .then(function() {

    busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {

      var dir = temp.mkdirSync();
      var filePath = dir + '/' + filename;

      fs.writeFileSync(filePath, '');

      file.on('data', function(data) {
        fs.appendFileSync(filePath, data);
      });

      file.on('end', function() {
        podio.uploadFile(filePath, filename)
        .then(function(body, response) {
          res.render('upload_success', { fileId: body.file_id })
        })
        .catch(function (err) {
          res.end(String(err));
        });
      });
    });
    req.pipe(busboy);
  })
  .catch(function () {
    res.send(401);
  });
});

module.exports = router;
