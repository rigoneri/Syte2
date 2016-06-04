var request = require('request'),
     moment = require('moment'),
         db = require('../db'),
      dates = require('../utils/dates');

var TUMBLR_API_URL = 'http://api.tumblr.com/v2/blog/';

var tumblrPosts = {};
var lastUpdated;

exports.monthActvity = function(page, cb) {
  dates.monthRange(page, function(start, end) {
    if (page == 0) {
      //if it's the first month check if data needs to be updated
      exports.update(function(updated) {
        if (!updated && tumblrPosts[start]) {
          cb(null, tumblrPosts[start]);
        } else {
          db.collection('tumblrdb').find({
            'date': { $gte: start, $lte: end }
          }).sort({'date': -1}).toArray(function (err, posts) {
            console.log('Tumblr month:', start,' got from db: ',  posts.length);
            if (!err && posts.length) {
              tumblrPosts[start] = posts;
            }
            cb(err, posts);
          });
        }
      });
    } else {
      if (tumblrPosts[start]) {
        cb(null, tumblrPosts[start]);
      } else {
        db.collection('tumblrdb').find({
          'date': { $gte: start, $lte: end }
        }).sort({'date': -1}).toArray(function (err, posts) {
          console.log('Tumblr month:', start,' got from db: ',  posts.length);
          if (!err && posts.length) {
            tumblrPosts[start] = posts;
          }
          cb(err, posts);
        });
      }
    }
  });
};

var allPosts = [];
var limit = 3;
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

    db.collection('tumblrdb').find(query)
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
  db.lastUpdatedDate(lastUpdated, 'tumblr', function(date) {
    var needUpdate = true;
    if (date) {
      var minutes = moment().diff(date, 'minutes');
      console.log('Tumblr next update in', process.env.TUMBLR_UPDATE_FREQ_MINUTES - minutes, 'minutes');
      if (minutes < process.env.TUMBLR_UPDATE_FREQ_MINUTES) {
        needUpdate = false;
      }
    }

    if (needUpdate) {
      exports.fetch(3, 0, function(err, posts) {
        console.log('Tumblr needUpdate && fetch:', posts.length);
        if (!err) {
          var bulk = db.collection('tumblrdb').initializeUnorderedBulkOp();
          for (var i=0; i<posts.length; i++) {
            var post = posts[i];
            bulk.find({'id': post.id}).upsert().updateOne(post);
          }
          bulk.execute();

          db.setLastUpdatedDate('tumblr', function(err) {
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
       console.log('Tumblr !needUpdate');
      cb(false);  
    }
  });
};

exports.setup = function(cb) {
  //Gets most of the users posts (up to 300?!) and saves to the db...
  var offset = 0;
  var count = 0;

  function _fetchAndSave(fetchCallback) {
    console.log('Tumblr _fetchAndSave, count: ', count, ' offset: ', offset);
    exports.fetch(20, offset, function(err, posts) {
      console.log('Tumblr _fetchAndSave, count: ', count, ' length: ', posts.length);
      if (!err && posts && posts.length > 0) {
        var bulk = db.collection('tumblrdb').initializeUnorderedBulkOp();
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
    db.setLastUpdatedDate('tumblr', function(err) {
      if (!err) {
        lastUpdated = new Date();
      } 
      exports.monthActvity(0, cb);
    });
  });
};

exports.fetch = function(count, offset, cb) { 
  var url = TUMBLR_API_URL + process.env.TUMBLR_BLOG + '/posts?api_key=' +
            process.env.TUMBLR_API_KEY + '&limit=' + count;

  if (offset) {
    url += '&offset=' + offset;
  }

  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      body = JSON.parse(body);
      if (body.response) {
        body = body.response.posts;
      }

      var posts = [];

      for (var i = 0; i < body.length; i++) {
        var post = body[i];
        if (post.state === 'published') {
          var createdDate = moment(new Date(parseInt(post.timestamp) * 1000));
          var cleanedPost = {
            'id': post.id,
            'date': createdDate.toISOString(),
            'type': 'tumblr',
            'url': post.post_url,
            'slug': post.slug,
            'tags': post.tags,
            'post_type': post.type
          };

          if (post.type === 'text') {
            cleanedPost.title = post.title;
            cleanedPost.body = post.body;
          } else if (post.type === 'photo') {
            cleanedPost.caption = post.caption;
          } else if (post.type === 'quote') {
            cleanedPost.quote = post.text;
            cleanedPost.source = post.source;
          } else if (post.type === 'link') {
            cleanedPost.title = post.title;
            cleanedPost.source_url = post.url;
          } else if (post.type == 'audio') {
            cleanedPost.source_url = post.source_url;
            cleanedPost.title = post.source_title;
            cleanedPost.caption = post.caption;
            cleanedPost.player = post.player;
          } else if (post.type == 'video') {
            cleanedPost.source_url = post.source_url;
            cleanedPost.title = post.source_title;
            cleanedPost.caption = post.caption;

            if (typeof post.player === 'string') {
              cleanedPost.player = post.player;
            } else if (post.player.length){
              var player = post.player[0];
              if (player && player.embed_code) {
                cleanedPost.player = player.embed_code;
              }
            }
          }

          if (post.photos) {
            var photos = [];
            for (var p=0; p<post.photos.length; p++) {
              var photo = post.photos[p];
              if (photo.original_size) {
                photos.push(photo.original_size.url);
              }
            }
            if (photos.length) {
              cleanedPost.photos = photos;
            }
          }

          if (cleanedPost.player) {
            var width = cleanedPost.player.match(/width="(\d+)"/);
            var height = cleanedPost.player.match(/height="(\d+)"/);

            if (width && width.length) {
              width = width[1];
            }

            if (height && height.length) {
              height = height[1];
            }

            if (width && height) {
              var newWidth = 300;
              var newHeight = (height / width) * newWidth;

              cleanedPost.player = cleanedPost.player.replace(/width="(\d+)"/g, 'width="'+ newWidth +'"');
              cleanedPost.player = cleanedPost.player.replace(/height="(\d+)"/g, 'height="'+ newHeight +'"');
            }
          }

          posts.push(cleanedPost);
        }
      }

      cb(null, posts);
    } else {
      cb(error, response);
    }
  });
};