var express = require('express'),
     router = express.Router(),
    Twitter = require('../models/twitter');

router.get('/', function(req, res) {
  Twitter.monthActvity(0, function(error, data) {
    if (!error) {
      res.status(200).json(data);
    }
  });
});

router.get('/user', function(req, res) {
  Twitter.user(function(error, data) {
    res.status(200).json(data);
  });
});

router.get('/:page', function(req, res) {
  var page = parseInt(req.params.page);
  if (!page) 
    page = 0;

  Twitter.monthActvity(page, function(error, data) {
    if (!error) {
      res.status(200).json(data);
    }
  });
});

module.exports = router;