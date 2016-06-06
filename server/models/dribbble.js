var request = require('request'),
     moment = require('moment'),
         db = require('../db'),
      dates = require('../utils/dates'),
      cache = require('memory-cache');

var DRIBBBLE_API_URL = 'https://api.dribbble.com/v1/';
var lastUpdated;

exports.monthActvity = function(page, cb) {
  if (process.env.DRIBBBLE_INTEGRATION_DISABLED == 'true') {
    cb(null, []);
    return;
  }

  dates.monthRange(page, function(start, end) {
    var cacheKey = 'dribbble-' + moment(start).format('YYYY-MM-DD');
    if (page == 0) {
      //if it's the first month check if data needs to be updated
      exports.update(function(updated) {
        var cachedData = cache.get(cacheKey);
        if (!updated && cachedData) {
          console.log('Dribbble page', page ,'used cache:', cachedData.length);
          cb(null, cachedData);
        } else {
          db.collection('dribbbledb').find({
            'date': { $gte: start, $lte: end }
          }).sort({'date': -1}).toArray(function (err, posts) {
            console.log('Dribbble page', page, 'used db:', posts.length);
            if (!err && posts.length) {
              exports.user(function(err, user) {
                if (user) {
                  for (var i=0; i<posts.length; i++) {
                    var post = posts[i];
                    post.user = user;
                  }
                }
                cache.put(cacheKey, posts);
                cb(err, posts);
              });
            } else {
              cb(err, posts);
            }
          });
        }
      });
    } else {
      var cachedData = cache.get(cacheKey);
      if (cachedData) {
        console.log('Dribbble page', page ,'used cache:', cachedData.length);
        cb(null, cachedData);
      } else {
        db.collection('dribbbledb').find({
          'date': { $gte: start, $lte: end }
        }).sort({'date': -1}).toArray(function (err, posts) {
          console.log('Dribbble page', page, 'used db:', posts.length);
          if (!err && posts.length) {
            exports.user(function(err, user) {
              if (user) {
                for (var i=0; i<posts.length; i++) {
                  var post = posts[i];
                  post.user = user;
                }
              }
              cache.put(cacheKey, posts);
              cb(err, posts);
            });
          } else {
            cb(err, posts);
          }
        });
      }
    }
  });
};

var lastUpdatedRecentActivity;
var allPosts = [];
var limit = 10;

exports.recentActivity = function(page, cb) {
  var needUpdate = true;
  if (lastUpdatedRecentActivity) {
    var minutes = moment().diff(lastUpdatedRecentActivity, 'minutes');
    if (minutes < process.env.DRIBBBLE_UPDATE_FREQ_MINUTES) {
      needUpdate = false;
    }
  }

  var query = {};
  if (needUpdate && page == 0) {
    allPosts = [];
  } else {
    var start = page * limit;
    var end = start + limit;
    
    if (allPosts.slice(start, end).length) {
      var pagePosts = allPosts.slice(start, end);
      cb(null, pagePosts);
      return;
    }

    if (allPosts.length > 0) {
      var lastPost = allPosts[allPosts.length -1];
      query = {'date' : { $lt: lastPost.date }};
    }
  }

  db.collection('dribbbledb').find(query)
    .limit(limit).sort({'date': -1}).toArray(function (err, posts) {
    if (!err && posts.length) {
      allPosts = allPosts.concat(posts);
      lastUpdatedRecentActivity = new Date();
      cb(null, posts);
    } else {
      cb(err, []);
    }
  });
};

exports.update = function(cb) {
  db.lastUpdatedDate(lastUpdated, 'dribbble', function(date) {
    var needUpdate = true;
    if (date) {
      var minutes = moment().diff(date, 'minutes');      
      if (minutes < process.env.DRIBBBLE_UPDATE_FREQ_MINUTES) {
        console.log('Dribbble next update in', process.env.DRIBBBLE_UPDATE_FREQ_MINUTES - minutes, 'minutes');
        needUpdate = false;
      }
    }

    if (needUpdate) {
      exports.fetch(10, 0, function(err, posts) {
        console.log('Dribbble needed update and fetched:', posts.length);
        if (!err) {
          var bulk = db.collection('dribbbledb').initializeUnorderedBulkOp();
          for (var i=0; i<posts.length; i++) {
            var post = posts[i];
            bulk.find({'id': post.id}).upsert().updateOne(post);
          }
          bulk.execute();

          db.setLastUpdatedDate('dribbble', function(err) {
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
      cb(false);  
    }
  });
};

exports.setup = function(cb) {
  if (process.env.DRIBBBLE_INTEGRATION_DISABLED == 'true') {
    cb(null, []);
    return;
  }

  //Gets most of the users dribbble posts and saves to the db...
  var page = 1;

  function _fetchAndSave(fetchCallback) {
    exports.fetch(30, page, function(err, posts) {
      console.log('Dribbble setup, page:', page, 'received:', posts.length);
      if (!err && posts && posts.length > 0) {
        var bulk = db.collection('dribbbledb').initializeUnorderedBulkOp();
        for (var i=0; i<posts.length; i++) {
          var post = posts[i];
          bulk.find({'id': post.id}).upsert().updateOne(post);
        }
        bulk.execute();

        page++;
        if (page > 3) {
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
    db.setLastUpdatedDate('dribbble', function(err) {
      if (!err) {
        lastUpdated = new Date();
      } 
      exports.monthActvity(0, cb);
    });
  });
};

exports.fetch = function(count, page, cb) { 
  var url = DRIBBBLE_API_URL + 'users/'+ 
            process.env.DRIBBBLE_USERNAME + '/shots?access_token=' +
            process.env.DRIBBBLE_ACCESS_TOKEN + '&per_page=' + count;

  if (page) {
    url += '&page=' + page;
  }

  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      body = JSON.parse(body);

      var posts = [];
      for (var i = 0; i < body.length; i++) {
        var post = body[i];
        var createdDate = moment(post.created_at);
        var cleanedPost = {
          'id': post.id,
          'date': createdDate.toISOString(),
          'type': 'dribbble',
          'title': post.title,
          'text': post.description,
          'views': post.views_count || 0,
          'likes': post.likes_count || 0,
          'comments': post.comments_count || 0,
          'url': post.html_url
        };

        if (post.images) {
          cleanedPost.picture = post.images.normal;

          if (post.images.hidpi) {
            cleanedPost.pictureHD = post.images.hidpi;
          } else {
            cleanedPost.pictureHD = post.images.normal;
            if (post.images.normal.indexOf('.gif') > 0) {
              cleanedPost.picture = post.images.normal.replace(/.gif/g, '_still.gif');
            }
          }
        }

        posts.push(cleanedPost);
      }

      cb(null, posts);
    } else {
      cb(error, []);
    }
  });
};

var lastUpdatedUser;

exports.user = function(cb) {
  var needUpdate = true;
  if (lastUpdatedUser) {
    var minutes = moment().diff(lastUpdatedUser, 'minutes');
    if (minutes < process.env.DRIBBBLE_UPDATE_FREQ_MINUTES) {
      needUpdate = false;
    }
  }

  var cachedUser = cache.get('dribbble-user');
  if (!needUpdate && cachedUser) {
    cb(null, cachedUser);
    return;
  }

  var url = DRIBBBLE_API_URL + 'users/'+ 
            process.env.DRIBBBLE_USERNAME + '?access_token=' +
            process.env.DRIBBBLE_ACCESS_TOKEN;

  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      body = JSON.parse(body);

      var dribbbleUser = {
        'id': body.id,
        'name': body.name,
        'username': body.username,
        'url': body.html_url,
        'picture': body.avatar_url,
        'followers': body.followers_count || 0,
        'following': body.followings_count || 0,
        'shots': body.shots_count || 0,
        'bio': body.bio
      };

      cache.put('dribbble-user', dribbbleUser);
      lastUpdatedUser = new Date();
      cb(null, dribbbleUser);
    } else {
      cb(error, null);
    }
  });
};