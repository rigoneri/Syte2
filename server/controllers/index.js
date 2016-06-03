var express = require('express'),
    router = express.Router();

router.use('/stream', require('./stream'));
router.use('/twitter', require('./twitter'));
router.use('/instagram', require('./instagram'));
router.use('/foursquare', require('./foursquare'));
router.use('/dribbble', require('./dribbble'));
router.use('/tumblr', require('./tumblr'));
router.use('/github', require('./github'));
router.use('/lastfm', require('./lastfm'));
router.use('/youtube', require('./youtube'));

// router.get('/', function(req, res) {
//   res.render('index')
// })

module.exports = router;