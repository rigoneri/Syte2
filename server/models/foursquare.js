var request = require('request'),
     moment = require('moment'),
         db = require('../db'),
      dates = require('../utils/dates');

var foursquareCheckins = {};
var lastUpdated;

exports.monthActvity = function(page, cb) {
  dates.monthRange(page, function(start, end) {
    if (page == 0) {
      //if it's the first month check if data needs to be updated
      exports.update(function(updated) {
        if (!updated && foursquareCheckins[start]) {
          cb(null, foursquareCheckins[start]);
        } else {
          db.collection('foursquaredb').find({
            'day': { $gte: start, $lte: end }
          }).sort({'date': -1}).toArray(function (err, posts) {
            console.log('Foursquare month:', start,' got from db: ',  posts.length);
            if (!err && posts.length) {
              foursquareCheckins[start] = posts;
            }
            cb(err, posts);
          });
        }
      });
    } else {
      if (foursquareCheckins[start]) {
        cb(null, foursquareCheckins[start]);
      } else {
        db.collection('foursquaredb').find({
          'day': { $gte: start, $lte: end }
        }).sort({'date': -1}).toArray(function (err, posts) {
          console.log('Foursquare month:', start,' got from db: ',  posts.length);
          if (!err && posts.length) {
            foursquareCheckins[start] = posts;
          }
          cb(err, posts);
        });
      }
    }
  });
};

exports.update = function(cb) {
  db.lastUpdatedDate(lastUpdated, 'foursquare', function(date) {
    var needUpdate = true;
    if (date) {
      var minutes = moment().diff(date, 'minutes');
      console.log('Foursquare next update in', process.env.FOURSQUARE_UPDATE_FREQ_MINUTES - minutes, 'minutes');
      if (minutes < process.env.FOURSQUARE_UPDATE_FREQ_MINUTES) {
        needUpdate = false;
      }
    }

    if (needUpdate) {
      exports.fetch(20, 0, function(err, checkins) {
        console.log('Foursquare needUpdate && fetch:', checkins.length);
        if (!err) {
          var bulk = db.collection('foursquaredb').initializeUnorderedBulkOp();
          for (var i=0; i<checkins.length; i++) {
            var checkin = checkins[i];
            bulk.find({'id': checkin.id}).upsert().updateOne(checkin);
          }
          bulk.execute();

          db.setLastUpdatedDate('foursquare', function(err) {
            if (!err) {
              lastUpdated = new Date();
              cb(true);
            } else {
              cb(false);
            }
          });
        } else {
          cb(false);
        }
      }); 
    } else {
      console.log('Foursquare !needUpdate');
      cb(false);  
    }
  });
};

exports.setup = function(cb) {
  //Gets most of the users checkins (up to 300?!) and saves to the db...
  var offset = 0;
  var count = 0;

  function _fetchAndSave(fetchCallback) {
    console.log('Foursquare _fetchAndSave, count: ', count, ' offset: ', offset);
    exports.fetch(100, offset, function(err, posts) {
      console.log('Foursquare _fetchAndSave, count: ', count, ' length: ', posts.length);
      if (!err && posts && posts.length > 0) {
        var bulk = db.collection('foursquaredb').initializeUnorderedBulkOp();
        for (var i=0; i<posts.length; i++) {
          var post = posts[i];
          bulk.find({'id': post.id}).upsert().updateOne(post);
        }
        bulk.execute();

        offset += posts.length;
        count++;
        if (count > 3) {
          fetchCallback();
        } else {
          _fetchAndSave(fetchCallback);
        }
      } else {
        fetchCallback();
      }
    }); 
  }

  _fetchAndSave(function() {
    db.setLastUpdatedDate('foursquare', function(err) {
      if (!err) {
        lastUpdated = new Date();
      } 
      exports.monthActvity(0, cb);
    });
  });
};

exports.fetch = function(count, offset, cb) { 
  var url = process.env.FOURSQUARE_API_URL + 'users/self/checkins?oauth_token=' +
            process.env.FOURSQUARE_ACCESS_TOKEN + '&v=20160520&limit=' + count;

  if (offset) {
    url += '&offset=' + offset;
  }

  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      body = JSON.parse(body);
      if (body.response) {
        body = body.response.checkins;
      }

      var checkins = [];

      for (var i = 0; i < body.items.length; i++) {
        var checkin = body.items[i];
        if (checkin.venue) {
          var createdDate = moment(new Date(parseInt(checkin.createdAt) * 1000));
          var cleanedPost = {
            'id': checkin.id,
            'date': createdDate.toISOString(),
            'day': moment(createdDate).format('YYYY-MM-DD'),
            'type': 'foursquare',
            'title': checkin.venue.name
          };

          if (checkin.event && checkin.event.name) {
            cleanedPost.event = checkin.event.name;
          }

          if (checkin.venue.location) {
            cleanedPost.lat = checkin.venue.location.lat;
            cleanedPost.lng = checkin.venue.location.lng;
            cleanedPost.city = checkin.venue.location.city;
            cleanedPost.state = checkin.venue.location.state;
            cleanedPost.country = checkin.venue.location.cc;
          }

          if (checkin.venue.categories && checkin.venue.categories.length > 0) {
            var category = checkin.venue.categories[0];
            cleanedPost.category = category.shortName;
            if (category.icon) {
              cleanedPost.icon = category.icon.prefix + '64' + category.icon.suffix;
            }
          }

          if (checkin.venue.id) {
            cleanedPost.url = 'https://foursquare.com/v/' + checkin.venue.id;
          }

          checkins.push(cleanedPost);
        }
      }

      cb(null, checkins);
    } else {
      cb(error, []);
    }
  });
};

var foursquareUser;
var lastUpdatedUser;

exports.user = function(cb) {
  var needUpdate = true;
  if (lastUpdatedUser) {
    var minutes = moment().diff(lastUpdatedUser, 'minutes');
    if (minutes < process.env.FOURSQUARE_UPDATE_FREQ_MINUTES) {
      needUpdate = false;
    }
  }

  if (!needUpdate && foursquareUser) {
    cb(null, foursquareUser);
    return;
  }

  var url = process.env.FOURSQUARE_API_URL + 'users/self?oauth_token=' +
            process.env.FOURSQUARE_ACCESS_TOKEN + '&v=20160520';

  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      body = JSON.parse(body);
      if (body.response) {
        body = body.response.user;
      }

      foursquareUser = {
        'id': body.id,
        'name': body.firstName + ' ' + body.lastName,
        'url': body.canonicalUrl,
        'checkins': body.checkins ? body.checkins.count : null,
        'friends': body.friends ? body.friends.count : null,
        'bio': body.bio && body.bio.length ? body.bio : null,
        'location': body.homeCity
      };

      if (body.photo && body.photo.suffix) {
        //Foursquare's api returned the wrong prefix url so check the url with your foursquare profile.
        foursquareUser.picture = 'https://is0.4sqi.net/userpix_thumbs' + body.photo.suffix;
      }

      lastUpdatedUser = new Date();

      cb(null, foursquareUser);
    } else {
      cb(error, null);
    }
  });
};