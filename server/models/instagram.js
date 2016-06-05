var request = require('request'),
     moment = require('moment'),
         db = require('../db'),
      dates = require('../utils/dates');

var INSTAGRAM_API_URL = 'https://api.instagram.com/v1/';
var instagramPosts = {};
var lastUpdated;

exports.monthActvity = function(page, cb) {
  dates.monthRange(page, function(start, end) {
    if (page == 0) {
      //if it's the first month check if data needs to be updated
      exports.update(function(updated) {
        if (!updated && instagramPosts[start]) {
          cb(null, instagramPosts[start]);
        } else {
          db.collection('instagramdb').find({
            'date': { $gte: start, $lte: end }
          }).sort({'date': -1}).toArray(function (err, posts) {
            console.log('Instagram month:', start,' got from db: ',  posts.length);
            if (!err && posts.length) {
              instagramPosts = {};
              instagramPosts[start] = posts;
            }
            cb(err, posts);
          });
        }
      });
    } else {
      if (instagramPosts[start]) {
        cb(null, instagramPosts[start]);
      } else {
        db.collection('instagramdb').find({
          'date': { $gte: start, $lte: end }
        }).sort({'date': -1}).toArray(function (err, posts) {
          console.log('Instagram month:', start,' got from db: ',  posts.length);
          if (!err && posts.length) {
            instagramPosts[start] = posts;
          }
          cb(err, posts);
        });
      }
    }
  });
};

exports.update = function(cb) {
  db.lastUpdatedDate(lastUpdated, 'instagram', function(date) {
    var needUpdate = true;
    if (date) {
      var minutes = moment().diff(date, 'minutes');
      console.log('Instagram next update in', process.env.INSTAGRAM_UPDATE_FREQ_MINUTES - minutes, 'minutes');
      if (minutes < process.env.INSTAGRAM_UPDATE_FREQ_MINUTES) {
        needUpdate = false;
      }
    } 

    if (needUpdate) {
      exports.fetch(10, null, function(err, posts) {
        console.log('Instagram needUpdate && fetch:', posts.length);
        if (!err) {
          var bulk = db.collection('instagramdb').initializeUnorderedBulkOp();
          for (var i=0; i<posts.length; i++) {
            var post = posts[i];
            bulk.find({'id': post.id}).upsert().updateOne(post);
          }
          bulk.execute();

          db.setLastUpdatedDate('instagram', function(err) {
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
      console.log('Instagram !needUpdate');
      cb(false);
    }
  });
};

exports.setup = function(cb) {
  //Gets most of the users instagram posts (up to 150?!) and saves to the db...

  var max_id = null;
  var count = 0;

  function _fetchAndSave(fetchCallback) {
    console.log('Instagram _fetchAndSave, count: ', count, ' max_id: ', max_id);
    exports.fetch(50, max_id, function(err, posts, next_max_id) {
      console.log('Instagram _fetchAndSave, count: ', count, ' length: ', posts.length);
      if (!err && posts && posts.length > 0) {
        var bulk = db.collection('instagramdb').initializeUnorderedBulkOp();
        for (var i=0; i<posts.length; i++) {
          var post = posts[i];
          bulk.find({'id': post.id}).upsert().updateOne(post);
        }
        bulk.execute();

        if (next_max_id) {
          max_id = next_max_id;
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
    db.setLastUpdatedDate('instagram', function(err) {
      if (!err) {
        lastUpdated = new Date();
      } 
      exports.monthActvity(0, cb);
    });
  });
};

exports.fetch = function(count, max_id, cb) {
  var url = INSTAGRAM_API_URL + 'users/' + process.env.INSTAGRAM_USER_ID + 
            '/media/recent/?count=' + count +
            '&access_token=' + process.env.INSTAGRAM_ACCESS_TOKEN;

  if (max_id) {
    url += '&max_id=' + max_id;
  }

  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      body = JSON.parse(body);

      var next_max_id = null;
      if (body.pagination && body.pagination.next_max_id) {
        next_max_id = body.pagination.next_max_id;
      }

      var posts = [];

      for (var i = 0; i < body.data.length; i++) {
        var post = body.data[i];
        var createdDate = moment(new Date(parseInt(post.created_time) * 1000));
        var cleanedPost = {
          'id': post.id,
          'date': createdDate.toISOString(),
          'type': 'instagram',
          'url': post.link,
          'video': post.videos && post.videos.standard_resolution ? post.videos.standard_resolution : null,
          'picture': post.images && post.images.thumbnail ? post.images.thumbnail.url : null,
          'pictureHD':  post.images && post.images.standard_resolution ? post.images.standard_resolution.url : null,
          'likes': post.likes && post.likes.count ? post.likes.count : 0,
          'comments': post.comments && post.comments.count ? post.comments.count : 0, 
          'text': post.caption && post.caption.text ? linkifyText(post.caption.text) : null,
          'user': post.user || null
        };

        if (post.images && post.images.thumbnail) {
          cleanedPost.picture = post.images.thumbnail.url.replace(/s150x150/g, 's320x320');
        }

        posts.push(cleanedPost);
      }

      cb(null, posts, next_max_id);
    } else {
      cb(error, []);
    }
  });

  function linkifyText(text) {
    text = text.replace(/(https?:\/\/\S+)/gi, function (s) {
      return '<a href="' + s + '" target="_blank">' + s + '</a>';
    });

    text = text.replace(/(^|)@(\w+)/gi, function (s) {
      return '<a href="https://instagram.com/' + s.replace(/@/,'') + '" target="_blank">' + s + '</a>';
    });

    text = text.replace(/(^|)#(\w+)/gi, function (s) {
      return '<a href="http://instagram.com/explore/tags/' + s.replace(/#/,'') + '" target="_blank">' + s + '</a>';
    });

    text = text.replace(/\n/g, '<br>');

    return text;
  }
};

var instagramUser;
var lastUpdatedUser;

exports.user = function(cb) {
  var needUpdate = true;
  if (lastUpdatedUser) {
    var minutes = moment().diff(lastUpdatedUser, 'minutes');
    if (minutes < process.env.INSTAGRAM_UPDATE_FREQ_MINUTES) {
      needUpdate = false;
    }
  }

  if (!needUpdate && instagramUser) {
    cb(null, instagramUser);
    return;
  }

  var url = INSTAGRAM_API_URL + 'users/' + 
            process.env.INSTAGRAM_USER_ID + '?access_token=' + 
            process.env.INSTAGRAM_ACCESS_TOKEN;

  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      body = JSON.parse(body);
      instagramUser = body.data;
      instagramUser.url = 'https://instagram.com/' + instagramUser.username;

      lastUpdatedUser = new Date();

      cb(null, instagramUser);
    } else {
      cb(error, null);
    }
  });
};

var INSTAGRAM_TOKEN_URL = 'https://api.instagram.com/oauth/access_token',
    INSTAGRAM_AUTH_REDIRECT_URL = 'http://localhost:3000/instagram/auth';

exports.getToken = function(code, cb) {
  request({
    'url': INSTAGRAM_TOKEN_URL,
    'method': 'POST',
    'form': {
      'client_id': process.env.INSTAGRAM_CLIENT_ID,
      'client_secret': process.env.INSTAGRAM_CLIENT_SECRET,
      'grant_type': 'authorization_code',
      'redirect_uri': INSTAGRAM_AUTH_REDIRECT_URL,
      'code': code
    }
  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      body = JSON.parse(body);
      if (body.access_token) {
        cb({
          'access_token': body.access_token,
          'user_id': body.user.id
        });
      } else {
        cb(body);
      }
    } else {
      cb(body);
    }
  });
};