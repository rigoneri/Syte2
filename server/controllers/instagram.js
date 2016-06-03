var express = require('express'),
     router = express.Router(),
  Instagram = require('../models/instagram');

router.get('/', function(req, res) {
  Instagram.monthActvity(0, function(error, data) {
    if (!error) {
      res.status(200).json(data);
    }
  });
});

router.get('/user', function(req, res) {
  Instagram.user(function(error, data) {
    res.status(200).json(data);
  });
});

router.get('/:page', function(req, res) {
  var page = parseInt(req.params.page);
  if (!page) 
    page = 0;

  Instagram.monthActvity(page, function(error, data) {
    if (!error) {
      res.status(200).json(data);
    }
  });
});

module.exports = router;