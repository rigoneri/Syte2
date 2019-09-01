var request = require('request'),
     moment = require('moment'),
         db = require('../db'),
      dates = require('../utils/dates'),
      async = require('async'),
      cache = require('memory-cache');

var LASTFM_API_URL = 'http://ws.audioscrobbler.com/2.0/';
var lastUpdated;

exports.monthActivity = function(page, cb) {
  if (process.env.LASTFM_INTEGRATION_DISABLED == 'true') {
    cb(null, []);
    return;
  }

  dates.monthRange(page, function(start, end) {
    var cacheKey = 'lastfm-' + moment(start).format('YYYY-MM-DD');
    if (page == 0) {
      //if it's the first month check if data needs to be updated
      exports.update(function(updated) {
        var cachedData = cache.get(cacheKey);
        if (!updated && cachedData) {
          console.log('Lastfm page', page ,'used cache:', cachedData.length);
          cb(null, cachedData);
        } else {
          db.collection('lastfmdb').find({
            'date': { $gte: start, $lte: end }
          }).sort({'date': -1}).toArray(function (err, posts) {
            console.log('Lastfm page', page, 'used db:', posts.length);
            if (!err && posts.length) {
              cache.put(cacheKey, posts);
            }
            cb(err, posts);
          });
        }
      });
    } else {
      var cachedData = cache.get(cacheKey);
      if (cachedData) {
        console.log('Lastfm page', page ,'used cache:', cachedData.length);
        cb(null, cachedData);
      } else {
        db.collection('lastfmdb').find({
          'date': { $gte: start, $lte: end }
        }).sort({'date': -1}).toArray(function (err, posts) {
          console.log('Lastfm page', page, 'used db:', posts.length);
          if (!err && posts.length) {
            cache.put(cacheKey, posts);
          }
          cb(err, posts);
        });
      }
    }
  });
};

exports.update = function(cb) {
  db.lastUpdatedDate(lastUpdated, 'lastfm', function(date) {
    var needUpdate = true;
    if (date) {
      var minutes = moment().diff(date, 'minutes');
      if (minutes < process.env.LASTFM_UPDATE_STREAM_FREQ_MINUTES) {
        console.log('Lastfm next update in', process.env.LASTFM_UPDATE_STREAM_FREQ_MINUTES - minutes, 'minutes');
        needUpdate = false;
      }
    }

    if (needUpdate) {
      var from = moment(date).subtract(1, 'day');
      var page = 1;
      var groups = {};

      function _fetchAndGroup(fetchCallback) {
        exports.fetch(200, page, function(err, activities) {
          console.log('Lastfm needed update and fetched:', activities.length);
          if (!err && activities && activities.length > 0) {

            for(var i=0; i<activities.length; i++) {
              var activity = activities[i];
              var day = moment(activity.date).format('YYYY-MM-DD');
              if (groups[day]) {
                var group = groups[day];
                if (group[activity.artist]) {
                  group[activity.artist].plays += 1;
                } else {
                  group[activity.artist] = activity;
                }
              } else {
                var group = {};
                group[activity.artist] = activity;
                groups[day] = group;
              }
            }

            page++;
            if (activities.length < 200) {
              fetchCallback();
            } else {
              _fetchAndGroup(fetchCallback);
            }
          } else {
            fetchCallback();
          }
        }, from.unix());
      }

      _fetchAndGroup(function() {
        var activitiesToSave = _groupActivitiesToSave(groups);
        if (activitiesToSave.length) {
          var bulk = db.collection('lastfmdb').initializeUnorderedBulkOp();
          for (var i=0; i<activitiesToSave.length; i++) {
            var activity = activitiesToSave[i];
            bulk.find({'id': activity.id}).upsert().updateOne(activity);
          }
          bulk.execute(function(err, result) {
            if (err) {
              console.log('Lastfm Bulk Error', err);
            }
            db.setLastUpdatedDate('lastfm', function(err) {
              if (!err) {
                lastUpdated = new Date();
                cb(true);
              } else {
                cb(false);
              }
            });
          });
        } else {
          cb(false);
        }
      });
    } else {
      cb(false);
    }
  });
};

exports.setup = function(cb) {
  if (process.env.LASTFM_INTEGRATION_DISABLED == 'true') {
    cb(null, []);
    return;
  }

  //Gets most of the users tracks (up to 3000?!) and saves to the db...
  var page = 1;
  var groups = {};

  function _fetchAndGroup(fetchCallback) {
    exports.fetch(200, page, function(err, activities) {
      console.log('Lasfm setup, page:', page, 'received:', activities.length);
      if (!err && activities && activities.length > 0) {

        for(var i=0; i<activities.length; i++) {
          var activity = activities[i];
          var day = moment(activity.date).format('YYYY-MM-DD');
          if (groups[day]) {
            var group = groups[day];
            if (group[activity.artist]) {
              group[activity.artist].plays += 1;
            } else {
              group[activity.artist] = activity;
            }
          } else {
            var group = {};
            group[activity.artist] = activity;
            groups[day] = group;
          }
        }

        page++;
        if (page > 15) {
          fetchCallback();
        } else {
          _fetchAndGroup(fetchCallback);
        }
      } else {
        fetchCallback();
      }
    });
  }

  _fetchAndGroup(function() {
    var activitiesToSave = _groupActivitiesToSave(groups);
    if (activitiesToSave.length) {
      var bulk = db.collection('lastfmdb').initializeUnorderedBulkOp();
      for (var i=0; i<activitiesToSave.length; i++) {
        var activity = activitiesToSave[i];
        bulk.find({'id': activity.id}).upsert().updateOne(activity);
      }
      bulk.execute(function(err, result) {
        db.setLastUpdatedDate('lastfm', function(err) {
          if (!err) {
            lastUpdated = new Date();
          }
          exports.monthActivity(0, cb);
        });
      });
    }
  });
};

function _groupActivitiesToSave(groups) {
  var activitiesToSave = [];

  for (var day in groups) {
    var group = groups[day];

    var tracks = [];
    var totalPlays = 0;

    for (var artist in group) {
      var trackInfo = group[artist];
      totalPlays += trackInfo.plays;

      if (trackInfo.image) {
        tracks.push(trackInfo);
      }
    }

    tracks.sort(function(a, b) {
      return a.plays < b.plays ? 1 : -1;
    });

    var activity = {
      'id': day,
      'day': day,
      'date': moment(day).add(1439, 'minutes').toISOString(),
      'type': 'lastfm',
      'plays': totalPlays,
      'tracks': []
    };

    for (var t=0; t<tracks.length; t++) {
      var track = tracks[t];
      activity.tracks.push({
        'title': track.title,
        'artist': track.artist,
        'image': track.image,
        'url': track.url
      });

      if (t >= 5) {
        break;
      }
    }

    activitiesToSave.push(activity);
  }

  return activitiesToSave;
}

exports.fetch = function(count, page, cb, from) {
  var url = LASTFM_API_URL + '?method=user.getrecenttracks&user=' +
            process.env.LASTFM_USERNAME + '&extended=1&api_key=' +
            process.env.LASTFM_API_KEY + '&format=json&limit=' + count;

  if (page) {
    url += '&page=' + page;
  }

  if (from) {
    url += '&from=' + from;
  }

  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      body = JSON.parse(body);
      cb(null, _cleanFetchResponse(body.recenttracks.track));
    } else {
      cb(error, []);
    }
  });
};

function _cleanFetchResponse(recentTracks) {
  var tracks = [];

  for (var i = 0; i < recentTracks.length; i++) {
    var track = recentTracks[i];
    if (!track.date) //now playing...
      continue;

    var createdDate = moment(new Date(parseInt(track.date.uts) * 1000));
    var cleanedTrack = {
      'day': moment(createdDate).format('YYYY-MM-DD'),
      'date': createdDate.toISOString(),
      'title': track.name,
      'plays': 1
    };

    if (track.url) {
      cleanedTrack.url = track.url;
    }

    if (track.image) {
      for(var g=0; g<track.image.length; g++) {
        var ig = track.image[g];
        if (ig.size == 'medium' && ig['#text']) {
          cleanedTrack.image = ig['#text'];
        }
      }
    }

    if (track.artist) {
      cleanedTrack.artist = track.artist.name;
      if (!cleanedTrack.url && track.artist.url) {
        cleanedTrack.url = track.artist.url;
      }

      if (!cleanedTrack.image && track.artist.image) {
        for(var g=0; g<track.artist.length; g++) {
          var ig = track.artist[g];
          if (ig.size == 'medium' && ig['#text']) {
            cleanedTrack.image = ig['#text'];
          }
        }
      }
    }

    tracks.push(cleanedTrack);
  }

  return tracks;
}

var lastUpdatedUser;

exports.user = function(cb) {
  var needUpdate = true;
  if (lastUpdatedUser) {
    var minutes = moment().diff(lastUpdatedUser, 'minutes');
    if (minutes < (process.env.LASTFM_UPDATE_STREAM_FREQ_MINUTES * 10)) {
      needUpdate = false;
    }
  }

  var cachedUser = cache.get('lastfm-user');
  if (!needUpdate && cachedUser) {
    cb(null, cachedUser);
    return;
  }

  var url = LASTFM_API_URL + '?method=user.getinfo&user=' +
            process.env.LASTFM_USERNAME + '&api_key=' +
            process.env.LASTFM_API_KEY + '&format=json';

  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      body = JSON.parse(body);
      if (body.user) {
        body = body.user;
      }

      var lastfmUser = {
        'name': body.realname,
        'username': body.name,
        'url': body.url
      };

      if (body.image && body.image.length) {
        for (var i=0; i<body.image.length; i++) {
          var img = body.image[i];
          if (img.size === 'large') {
            lastfmUser.picture = img['#text'];
            break;
          }
        }
      }

      cache.put('lastfm-user', lastfmUser);
      lastUpdatedUser = new Date();
      cb(null, lastfmUser);
    } else {
      cb(error, null);
    }
  });
};


var lastUpdatedTracks;

exports.recentActivity = function(cb) {
  var needUpdate = true;
  if (lastUpdatedTracks) {
    var minutes = moment().diff(lastUpdatedTracks, 'minutes');
    if (minutes < (process.env.LASTFM_UPDATE_FREQ_MINUTES)) {
      needUpdate = false;
    }
  }

  var cachedActivity = cache.get('lastfm-activity');
  if (!needUpdate && cachedActivity.length) {
    cb(null, cachedActivity);
    return;
  }

  exports.fetch(50, 0, function(err, activities) {
    if (activities) {
      cache.put('lastfm-activity', activities);
      lastUpdatedTracks = new Date();
    }
    cb(err, activities);
  });
};

var lastUpdatedTop;

exports.topActivity =  function(cb) {
  var needUpdate = true;
  if (lastUpdatedTop) {
    var minutes = moment().diff(lastUpdatedTop, 'minutes');
    if (minutes < (process.env.LASTFM_UPDATE_STREAM_FREQ_MINUTES)) {
      needUpdate = false;
    }
  }

  var cachedActivity = cache.get('lastfm-top');
  if (!needUpdate && cachedActivity) {
    cb(null, cachedActivity);
    return;
  }

  async.series([
    _fetchTopArtists,
    _fetchTopAlbums,
    _fetchTopTracks
  ], function(err, results) {
    if (!err) {
      var topActivity = {
        'artists': results[0],
        'albums': results[1],
        'tracks': results[2]
      };
      lastUpdatedTop = new Date();
      cache.put('lastfm-top', topActivity);
      cb(err, topActivity);
    } else {
      cb(err, results);
    }
  });
};

function _fetchTopArtists(cb) {
  var url = LASTFM_API_URL + '?method=user.gettopartists&user=' +
            process.env.LASTFM_USERNAME + '&period=6month&limit=5&api_key=' +
            process.env.LASTFM_API_KEY + '&format=json';

  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      body = JSON.parse(body);
      if (body.topartists) {
        body = body.topartists.artist;
      }

      var topArtists = [];
      for (var i = 0; i<body.length; i++) {
        var item = body[i];
        var artist = {
          'name': item.name,
          'count': item.playcount,
          'url': item.url
        };

        if (item.image) {
          for(var g=0; g<item.image.length; g++) {
            var ig = item.image[g];
            if (ig.size == 'large' && ig['#text']) {
              artist.image = ig['#text'];
            }
          }
        }

        topArtists.push(artist);
      }

      cb(null, topArtists);
    } else {
      cb(error, null);
    }
  });
};

function _fetchTopAlbums(cb) {
  var url = LASTFM_API_URL + '?method=user.gettopalbums&user=' +
            process.env.LASTFM_USERNAME + '&period=6month&limit=5&api_key=' +
            process.env.LASTFM_API_KEY + '&format=json';

  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      body = JSON.parse(body);
      if (body.topalbums) {
        body = body.topalbums.album;
      }

      var topAlbums = [];
      for (var i = 0; i<body.length; i++) {
        var item = body[i];
        var album = {
          'name': item.name,
          'count': item.playcount,
          'url': item.url
        };

        if (item.artist) {
          album.artist = item.artist.name;
        }

        if (item.image) {
          for(var g=0; g<item.image.length; g++) {
            var ig = item.image[g];
            if (ig.size == 'large' && ig['#text']) {
              album.image = ig['#text'];
            }
          }
        }

        topAlbums.push(album);
      }

      cb(null, topAlbums);
    } else {
      cb(error, null);
    }
  });
};

function _fetchTopTracks(cb) {
  var url = LASTFM_API_URL + '?method=user.gettoptracks&user=' +
            process.env.LASTFM_USERNAME + '&period=6month&limit=5&api_key=' +
            process.env.LASTFM_API_KEY + '&format=json';

  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      body = JSON.parse(body);

      if (body.toptracks) {
        body = body.toptracks.track;
      }

      var topTracks = [];
      for (var i = 0; i<body.length; i++) {
        var item = body[i];
        var track = {
          'name': item.name,
          'count': item.playcount,
          'url': item.url
        };

        if (item.artist) {
          track.artist = item.artist.name;
        }

        if (item.image) {
          for(var g=0; g<item.image.length; g++) {
            var ig = item.image[g];
            if (ig.size == 'large' && ig['#text']) {
              track.image = ig['#text'];
            }
          }
        }

        topTracks.push(track);
      }

      cb(null, topTracks);
    } else {
      cb(error, null);
    }
  });
};
