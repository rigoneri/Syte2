var express = require('express'),
     router = express.Router(),
  Lastfm = require('../models/lastfm');

router.get('/', function(req, res) {
  Lastfm.monthActvity(0, function(error, data) {
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

  Lastfm.setup(function(error, data) {
    res.status(200).send(error ? 'Setup failed see logs': 'Setup done!');
  });
});

router.get('/user', function(req, res) {
  Lastfm.user(function(error, data) {
    res.status(200).json(data);
  });
});

router.get('/activity', function(req, res) {
  Lastfm.recentActivity(function(error, data) {
    if (!error) {
      res.status(200).json(data);
    }
  });
});

router.get('/top', function(req, res) {
  Lastfm.topActivity(function(error, data) {
    if (!error) {
      res.status(200).json(data);
    }
  });
});


module.exports = router;
