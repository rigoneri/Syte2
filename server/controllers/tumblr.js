var express = require('express'),
     router = express.Router(),
     Tumblr = require('../models/tumblr');

router.get('/setup', function(req, res) {
  Tumblr.monthActvity(0, function(error, data) {
    if (!error) {
      res.status(200).json(data);
    }
  });
});

router.get('/:page', function(req, res) {
  var page = parseInt(req.params.page);
  if (!page) 
    page = 0;

  Tumblr.recentActivity(page, function(error, data) {
    if (!error) {
      res.status(200).json(data);
    }
  });
});

module.exports = router;