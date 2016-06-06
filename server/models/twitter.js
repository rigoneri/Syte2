var Twitter = require('twitter'),
     moment = require('moment'),
         db = require('../db'),
      dates = require('../utils/dates'),
      cache = require('memory-cache');

var lastUpdated;

exports.monthActvity = function(page, cb) {
  dates.monthRange(page, function(start, end) {
    var cacheKey = 'twitter-' + moment(start).format('YYYY-MM-DD');
    if (page == 0) {
      //if it's the first month check if data needs to be updated
      exports.update(function(updated) {
        var cachedData = cache.get(cacheKey);
        if (!updated && cachedData) {
          console.log('Twitter page', page ,'used cache:', cachedData.length);
          cb(null, cachedData);
        } else {
          db.collection('twitterdb').find({
            'date': { $gte: start, $lte: end },
            'type': 'twitter'
          }).sort({'date': -1}).toArray(function (err, posts) {
            console.log('Twitter page', page, 'used db:', posts.length);
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
        console.log('Twitter page', page ,'used cache:', cachedData.length);
        cb(null, cachedData);
      } else {
        db.collection('twitterdb').find({
          'date': { $gte: start, $lte: end },
          'type': 'twitter'
        }).sort({'date': -1}).toArray(function (err, posts) {
          console.log('Twitter page', page, 'used db:', posts.length);
          if (!err && posts.length) {
            cache.put(cacheKey, posts);
          }
          cb(err, posts);
        });
      }
    }
  });
};

exports.user = function(cb) {
  var cachedUser = cache.get('twitter-user');
  if (cachedUser) {
    cb(null, cachedUser);
  } else {
    db.collection('twitterdb').findOne({'type': 'user'}, function(err, user) {;
      if (user) {
        cache.put('twitter-user', user);
      }
      cb(err, user);
    });
  }
};

exports.update = function(cb) {
  db.lastUpdatedDate(lastUpdated, 'twitter', function(date) {
    var needUpdate = true;
    if (date) {
      var minutes = moment().diff(date, 'minutes');
      if (minutes < process.env.TWITTER_UPDATE_FREQ_MINUTES) {
        console.log('Twitter next update in', process.env.TWITTER_UPDATE_FREQ_MINUTES - minutes, 'minutes');
        needUpdate = false;
      }
    }

    if (needUpdate) {
      exports.fetch(30, null, function(err, posts, userInfo, userPictures) {
        console.log('Twitter needed update and fetched:', posts.length);
        if (!err) {
          var bulk = db.collection('twitterdb').initializeUnorderedBulkOp();
          for (var i=0; i<posts.length; i++) {
            var post = posts[i];
            bulk.find({'id': post.id}).upsert().updateOne(post);
          }
          bulk.execute();

          db.setLastUpdatedDate('twitter', function(err) {
            if (!err) {
              lastUpdated = new Date();

              var cachedUser = cache.get('twitter-user');
              if (cachedUser && userInfo && userPictures) {
                if (userPictures.length < 4) {
                  var pictures = cachedUser.pictures || [];
                  for (var p=0; p < pictures.length; p++) {
                    var picture = pictures[p];
                    var found = false;
                    for (var up=0; up < userPictures.length; up++) {
                      var userPicture = userPictures[up];
                      if (picture.id == userPicture.id) {
                        found = true;
                        break;
                      }
                    }

                    if (!found) {
                      userPictures.push(picture);
                    }
                  }

                  userPictures.sort(function(a, b) {
                    return a.date < b.date ? 1 : -1;
                  });
                }

                userInfo.pictures = userPictures.slice(0, 4);
                cache.put('twitter-user', userInfo);
                db.collection('twitterdb').updateOne({'id': userInfo.id}, userInfo, {upsert: true}, function(err, results) {
                  cb(true);
                });
              } else {
                cb(true);
              }
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
  //Gets most of the users tweets (up to 300?!) and saves to the db...
  var max_id = null;
  var count = 0;
  var user;

  function _fetchAndSave(fetchCallback) {
    exports.fetch(100, max_id, function(err, posts, userInfo, userPictures) {
      console.log('Twitter setup, page:', count, 'received:', posts.length);
      if (!err && posts && posts.length > 0) {
        var last_id = null;
        var bulk = db.collection('twitterdb').initializeUnorderedBulkOp();
        for (var i=0; i<posts.length; i++) {
          var post = posts[i];
          bulk.find({'id': post.id}).upsert().updateOne(post);
          last_id = post.id;
        }
        bulk.execute();

        if (!user && userInfo) {
          user = userInfo;
          user.pictures = [];
        }

        if (user && userPictures && user.pictures.length < 4) {
          user.pictures = user.pictures.concat(userPictures);
        }

        max_id = last_id;
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
    db.setLastUpdatedDate('twitter', function(err) {
      if (!err) {
        lastUpdated = new Date();
      }
      
      if (user) {
        cache.put('twitter-user', user);
        db.collection('twitterdb').updateOne({'id': user.id}, user, {upsert: true}, function(err, results) {
          exports.monthActvity(0, cb);
        });
      }
    });
  });
};

exports.fetch = function(count, max_id, cb) {
  var client = new Twitter({
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
    access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
  });

  var body = {
    screen_name: process.env.TWITTER_USERNAME,
    include_rts: true,
    exclude_replies: true,
    count: count
  };

  if (max_id) {
    body.max_id = max_id;
  }

  client.get('statuses/user_timeline', body, function(error, tweets, response){
      if (!error) {
        var posts = [];
        var userInfo;
        var userPictures = [];

        for (var i = 0; i < tweets.length; i++) {
          var tweet = tweets[i];
          var createdDate = moment(tweet.created_at, 'dd MMM DD HH:mm:ss ZZ YYYY');
          var post = {
            'id': tweet.id_str,
            'date': createdDate.toISOString(),
            'type': 'twitter',
            'text': linkifyText(tweet.text)
          };

          if (tweet.extended_entities && tweet.extended_entities.media) {
            var pictures = [];
            for (var m = 0; m < tweet.extended_entities.media.length; m++) {
                var media = tweet.extended_entities.media[m];
                var cleanedMedia = {
                  'id': media.id_str,
                  'url': media.media_url_https
                };

                if (media.sizes && media.sizes.small) {
                  cleanedMedia.width = media.sizes.small.w;
                  cleanedMedia.height = media.sizes.small.h;
                }

                pictures.push(cleanedMedia);

                if (media.video_info && media.video_info.variants) {
                  for(var v=0; v < media.video_info.variants.length; v++) {
                    var videoInfo = media.video_info.variants[v];
                    if (videoInfo.content_type && videoInfo.content_type == 'video/mp4') {
                      post.video = videoInfo.url;
                    }
                  }
                } 
            }
            post.pictures = pictures;

            if (!tweet.retweeted_status && pictures && (!max_id || userPictures.length < 4)) {
              for (var p = 0; p < pictures.length; p++) {
                var picture = pictures[0];
                picture.tweetID = tweet.id_str;
                picture.date = post.date;
                userPictures.push(picture);
              }
            }
          }

          if (tweet.retweeted_status && tweet.retweeted_status.user) {
            post.url = "https://www.twitter.com/" + tweet.retweeted_status.user.screen_name + '/status/' + tweet.retweeted_status.id_str;
            post.favorites = tweet.retweeted_status.favorite_count;
            post.retweets = tweet.retweeted_status.retweet_count;
            post.user = {
              'username': tweet.retweeted_status.user.screen_name,
              'name': tweet.retweeted_status.user.name,
              'picture': tweet.retweeted_status.user.profile_image_url_https,
              'id': tweet.retweeted_status.user.id_str
            };
            post.originalText = linkifyText(tweet.retweeted_status.text);
          } else {
            post.url = "https://www.twitter.com/" + tweet.user.screen_name + '/status/' + tweet.id_str;
            post.favorites = tweet.favorite_count;
            post.retweets = tweet.retweet_count;
            post.user = {
              'username': tweet.user.screen_name,
              'name': tweet.user.name,
              'picture': tweet.user.profile_image_url_https,
              'id': tweet.user.id_str
            };
          }

          if (!max_id && !userInfo) {
            userInfo = {
              'id': tweet.user.id_str,
              'type': 'user',
              'name': tweet.user.name,
              'username': tweet.user.screen_name,
              'description': linkifyText(tweet.user.description),
              'location': tweet.user.location && tweet.user.location.length ? tweet.user.location : null,
              'url': tweet.user.url,
              'followers': tweet.user.followers_count,
              'following': tweet.user.friends_count,
              'statuses': tweet.user.statuses_count,
              'picture': tweet.user.profile_image_url_https ? tweet.user.profile_image_url_https.replace(/_normal/gi, '') :  tweet.user.profile_image_url_http,
              'banner': tweet.user.profile_banner_url ? tweet.user.profile_banner_url + '/mobile_retina' : null
            };
          }

          posts.push(post);
        }

        cb(null, posts, userInfo, userPictures);
      } else {
        cb(error, []);
      }
  });

  function linkifyText(text) {
    text = text.replace(/(https?:\/\/\S+)/gi, function (s) {
      return '<a href="' + s + '" target="_blank">' + s + '</a>';
    });

    text = text.replace(/(^|)@(\w+)/gi, function (s) {
      return '<a href="https://twitter.com/' + s + '" target="_blank">' + s + '</a>';
    });

    text = text.replace(/(^|)#(\w+)/gi, function (s) {
      return '<a href="https://twitter.com/search?q=' + s.replace(/#/,'%23') + '" target="_blank">' + s + '</a>';
    });

    text = text.replace(/\n/g, '<br>');

    return text;
  }
};