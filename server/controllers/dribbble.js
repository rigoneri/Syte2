var express = require('express'),
     router = express.Router(),
  Dribbble = require('../models/dribbble');

var DRIBBBLE_AUTH_URL = 'https://dribbble.com/oauth/authorize',
    DRIBBBLE_AUTH_REDIRECT_URL = 'http://localhost:3000/dribbble/auth';

router.get('/', function(req, res) {
  Dribbble.monthActvity(0, function(error, data) {
    if (!error) {
      res.status(200).json(data);
    }
  });
});

router.get('/setup', function(req, res) {
  if (process.env.SETUP_ENABLED != 'true') {
    res.status(404).send('Not found');
    return;
  }

  Dribbble.setup(function(error, data) {
    res.status(200).send(error ? 'Setup failed see logs': 'Setup done!');
  });
});


router.get('/auth', function(req, res) {
  if (process.env.DRIBBBLE_OAUTH_ENABLED != 'true') {
    res.status(404).send('Not found');
    return;
  }

  var code = req.query.code;
  if (code) {
    Dribbble.getToken(code, function(response) {
      res.status(200).json(response);
    });
  } else {
    var url = DRIBBBLE_AUTH_URL + '?client_id=' + process.env.DRIBBBLE_CLIENT_ID +
      '&redirect_uri=' + DRIBBBLE_AUTH_REDIRECT_URL + '&response_type=code';
    res.redirect(url);
  }
});


router.get('/user', function(req, res) {
  Dribbble.user(function(error, data) {
    res.status(200).json(data);
  });
});

router.get('/:page', function(req, res) {
  var page = parseInt(req.params.page);
  if (!page)
    page = 0;

  Dribbble.recentActivity(page, function(error, data) {
    if (!error) {
      res.status(200).json(data);
    }
  });
});

module.exports = router;
