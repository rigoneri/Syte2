var express = require('express'),
     router = express.Router(),
  Foursquare = require('../models/foursquare');

router.get('/', function(req, res) {
  Foursquare.monthActvity(0, function(error, data) {
    if (!error) {
      res.status(200).json(data);
    }
  });
});

router.get('/setup', function(req, res) {
  Foursquare.setup(function(error, data) {
    if (!error) {
      res.status(200).json(data);
    }
  });
});

router.get('/user', function(req, res) {
  Foursquare.user(function(error, data) {
    if (!error) {
      res.status(200).json(data);
    }
  });
});

router.get('/:page', function(req, res) {
  var page = parseInt(req.params.page);
  if (!page) 
    page = 0;

  Foursquare.monthActvity(page, function(error, data) {
    if (!error) {
      res.status(200).json(data);
    }
  });
});

module.exports = router;