var express = require('express'),
     router = express.Router(),
  Dribbble = require('../models/dribbble');

router.get('/', function(req, res) {
  Dribbble.monthActvity(0, function(error, data) {
    if (!error) {
      res.status(200).json(data);
    }
  });
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