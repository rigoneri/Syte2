var express = require('express'),
     router = express.Router(),
     Tumblr = require('../models/tumblr');

router.get('/', function(req, res) {
  Tumblr.monthActvity(0, function(error, data) {
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

  Tumblr.setup(function(error, data) {
    res.status(200).send(error ? 'Setup failed see logs': 'Setup done!');
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
