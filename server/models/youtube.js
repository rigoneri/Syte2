var request = require('request'),
     moment = require('moment'),
         db = require('../db'),
      dates = require('../utils/dates');

var YOUTUBE_TOKEN_URL = 'https://accounts.google.com/o/oauth2/token',
    YOUTUBE_AUTH_REDIRECT_URL = 'http://localhost:3000/youtube/auth',
    YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/';

var youtubePosts = {};
var lastUpdated;

exports.monthActvity = function(page, cb) {
  dates.monthRange(page, function(start, end) {
    if (page == 0) {
      //if it's the first month check if data needs to be updated
      exports.update(function(updated) {
        if (!updated && youtubePosts[start]) {
          cb(null, youtubePosts[start]);
        } else {
          db.collection('youtubedb').find({
            'date': { $gte: start, $lte: end }
          }).sort({'date': -1}).toArray(function (err, posts) {
            console.log('Youtube month:', start,' got from db: ',  posts.length);
            if (!err && posts.length) {
              youtubePosts[start] = posts;
            }
            cb(err, posts);
          });
        }
      });
    } else {
      if (youtubePosts[start]) {
        cb(null, youtubePosts[start]);
      } else {
        db.collection('youtubedb').find({
          'date': { $gte: start, $lte: end }
        }).sort({'date': -1}).toArray(function (err, posts) {
          console.log('Youtube month:', start,' got from db: ',  posts.length);
          if (!err && posts.length) {
            youtubePosts[start] = posts;
          }
          cb(err, posts);
        });
      }
    }
  });
};

var allPosts = [];
var limit = 10;
exports.recentActivity = function(page, cb) {
    var start = page * limit;
    var end = start + limit;
    
    if (allPosts.slice(start, end).length) {
      var pagePosts = allPosts.slice(start, end);
      cb(null, pagePosts);
      return;
    }

    var query = {};
    if (allPosts.length > 0) {
      var lastPost = allPosts[allPosts.length -1];
      query = {'date' : { $lt: lastPost.date }};
    }

    db.collection('youtubedb').find(query)
      .limit(limit).sort({'date': -1}).toArray(function (err, posts) {
      if (!err && posts.length) {
        allPosts = allPosts.concat(posts);
        cb(null, posts);
      } else {
        cb(err, []);
      }
    });
};

exports.update = function(cb) {
  db.lastUpdatedDate(lastUpdated, 'youtube', function(date) {
    var needUpdate = true;
    if (date) {
      var minutes = moment().diff(date, 'minutes');
      console.log('Youtube next update in', process.env.YOUTUBE_UPDATE_FREQ_MINUTES - minutes, 'minutes');
      if (minutes < process.env.YOUTUBE_UPDATE_FREQ_MINUTES) {
        needUpdate = false;
      }
    } 

    if (needUpdate) {
      exports.fetch(3, null, function(err, posts) {
        console.log('Youtube needUpdate && fetch:', posts.length);
        if (!err) {
          var bulk = db.collection('youtubedb').initializeUnorderedBulkOp();
          for (var i=0; i<posts.length; i++) {
            var post = posts[i];
            bulk.find({'id': post.id}).upsert().updateOne(post);
          }
          bulk.execute();

          db.setLastUpdatedDate('youtube', function(err) {
            if (!err) {
              lastUpdated = new Date();
              cb(true);
            } else {
              cb(false);
            }
          });
        } else {
          cb(false)
        }
      }); 
    } else {
      console.log('Youtube !needUpdate');
      cb(false);
    }
  });
};

exports.setup = function(cb) {
  //Gets most of the users youtube posts (up to 150?!) and saves to the db...

  var nextToken = null;
  var count = 0;

  function _fetchAndSave(fetchCallback) {
    console.log('Youtube _fetchAndSave, count: ', count, ' nextToken: ', nextToken);
    exports.fetch(50, nextToken, function(err, posts, nextPageToken) {
      console.log('Youtube _fetchAndSave, count: ', count, ' length: ', posts.length);
      if (!err && posts && posts.length > 0) {
        var bulk = db.collection('youtubedb').initializeUnorderedBulkOp();
        for (var i=0; i<posts.length; i++) {
          var post = posts[i];
          bulk.find({'id': post.id}).upsert().updateOne(post);
        }
        bulk.execute();

        if (nextPageToken) {
          nextToken = nextPageToken;
          count++;
          if (count > 5) {
            fetchCallback();
          } else {
            _fetchAndSave(fetchCallback);
          }
        }
        else {
          fetchCallback();
        }
      } else {
        fetchCallback();
      }
    }); 
  }

  _fetchAndSave(function() {
    db.setLastUpdatedDate('youtube', function(err) {
      if (!err) {
        lastUpdated = new Date();
      } 
      exports.monthActvity(0, cb);
    });
  });
};

exports.fetch = function(count, nextToken, cb) {
  var url = YOUTUBE_API_URL + 'playlistItems?access_token=' +
      process.env.YOUTUBE_ACCESS_TOKEN + '&part=snippet,status&maxResults=' + count +
      '&playlistId='+ process.env.YOUTUBE_PLAYLIST_ID;

  if (nextToken) {
    url += '&pageToken=' + nextToken;
  }

  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      body = JSON.parse(body);
      var nextPageToken = body.nextPageToken || null;
      var posts = [];

      for (var i = 0; i < body.items.length; i++) {
        var status = body.items[i].status;
        if (status.privacyStatus == 'public') {
          var post = body.items[i].snippet;        
          if (post.publishedAt && post.resourceId) {
            var createdDate = moment(post.publishedAt);
            var cleanedPost = {
              'id': post.resourceId.videoId,
              'date': createdDate.toISOString(),
              'type': 'youtube',
              'title': post.title,
              'description': linkifyText(post.description)
            };

            if (post.thumbnails.medium) {
              cleanedPost.image = post.thumbnails.medium.url;
            } else if (post.thumbnails.high) {
              cleanedPost.image = post.thumbnails.high.url;
            } else if (post.thumbnails.default) {
              cleanedPost.image = post.thumbnails.high.default;
            }

            posts.push(cleanedPost);
          }
        }
      }

      cb(null, posts, nextPageToken);
    } else if (response.statusCode == 401){
      exports.refreshToken(function(success) {
        if (success) {
          exports.fetch(count, nextToken, cb);
        } else {
          cb(error, []);
        }
      });
    }
    else {
      cb(error, []);
    }
  });

  function linkifyText(text) {
    text = text.replace(/(https?:\/\/\S+)/gi, function (s) {
      return '<a href="' + s + '" target="_blank">' + s + '</a>';
    });

    text = text.replace(/\n/g, '<br>');

    return text;
  }
};

var youtubeUser;
var lastUpdatedUser;

exports.user = function(cb) {
  var needUpdate = true;
  if (lastUpdatedUser) {
    var minutes = moment().diff(lastUpdatedUser, 'minutes');
    if (minutes < process.env.YOUTUBE_UPDATE_FREQ_MINUTES) {
      needUpdate = false;
    }
  }

  if (!needUpdate && youtubeUser) {
    cb(null, youtubeUser);
    return;
  }

  var url = YOUTUBE_API_URL + 'channels?access_token=' +
       process.env.YOUTUBE_ACCESS_TOKEN + '&part=brandingSettings,statistics,snippet&mine=true'

  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      body = JSON.parse(body);
      if (body.items) {
        body = body.items[0];
        youtubeUser = {
          'id': body.id,
          'name': body.snippet.title,
          'url': 'https://www.youtube.com/channel/' + body.id
        };

        if (body.snippet.thumbnails && body.snippet.thumbnails.medium) {
          youtubeUser.picture = body.snippet.thumbnails.medium.url;
        }

        if (body.statistics) {
          youtubeUser.subscribers = body.statistics.subscriberCount;
        }

        if (body.brandingSettings && body.brandingSettings.image) {
          youtubeUser.banner = body.brandingSettings.image.bannerTabletLowImageUrl;
        }

        lastUpdatedUser = new Date();

        cb(null, youtubeUser);
      } else {
        cb(null, response);
      }
    } else if (response.statusCode == 401){
      exports.refreshToken(function(success) {
        if (success) {
          exports.user(cb);
        } else {
          cb(error, []);
        }
      });
    } else {
      cb(error, response);
    }
  });
};

exports.getToken = function(code, cb) {
  request({
    'url': YOUTUBE_TOKEN_URL,
    'method': 'POST',
    'form': {
      'code': code,
      'grant_type': 'authorization_code',
      'client_id': process.env.YOUTUBE_CLIENT_ID,
      'client_secret': process.env.YOUTUBE_CLIENT_SECRET,
      'redirect_uri': YOUTUBE_AUTH_REDIRECT_URL
    }
  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      body = JSON.parse(body);
      if (body.access_token) {
        var url = YOUTUBE_API_URL + 'channels?access_token=' +
          body.access_token + '&part=contentDetails&mine=true';

        request(url, function (error, response, channelsBody) {
          if (!error && response.statusCode == 200) {
            channelsBody = JSON.parse(channelsBody);
            var playlistID = channelsBody.items[0].contentDetails.relatedPlaylists.uploads;
            body.playlist_id = playlistID;
            cb(body)

            process.env.YOUTUBE_ACCESS_TOKEN = body.access_token;
            process.env.YOUTUBE_PLAYLIST_ID = playlistID;
            process.env.YOUTUBE_REFRESH_TOKEN = body.refresh_token;
          } else {
            cb(JSON.parse(channelsBody))
          }
        });
      }
    } else {
      cb(JSON.parse(body))
    }      
  });
};

exports.refreshToken = function(cb) {
  request({
      'url': YOUTUBE_TOKEN_URL,
      'method': 'POST',
      'form': {
        'grant_type': 'refresh_token',
        'client_id': process.env.YOUTUBE_CLIENT_ID,
        'client_secret': process.env.YOUTUBE_CLIENT_SECRET,
        'refresh_token': process.env.YOUTUBE_REFRESH_TOKEN
      }
    }, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        body = JSON.parse(body);
        if (body.access_token) {
          process.env.YOUTUBE_ACCESS_TOKEN = body.access_token;
          cb(true);
        } else {
          cb(false);
        }
      } else {
        cb(false)
      }
    });
};
