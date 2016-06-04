var express = require('express'),
     router = express.Router(),
     Github = require('../models/github');

router.get('/', function(req, res) {
  Github.monthActvity(1, function(error, data) {
    if (!error) {
      res.status(200).json(data);
    }
  });
});

router.get('/user', function(req, res) {
  Github.user(function(error, data) {
    if (!error) {
      res.status(200).json(data);
    }
  });
});

router.get('/repos', function(req, res) {
  Github.repos(function(error, data) {
    if (!error) {
      res.status(200).json(data);
    }
  });
});

router.get('/activity', function(req, res) {
  Github.recentActivity(function(error, data) {
    if (!error) {
      res.status(200).json(data);
    }
  });
});


module.exports = router;