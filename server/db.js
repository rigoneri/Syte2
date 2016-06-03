var MongoClient = require('mongodb').MongoClient;
var moment = require('moment');

var state = {
  db: null,
};

exports.connect = function(url, done) {
  if (state.db) 
    return done();

  MongoClient.connect(url, function(err, db) {
    if (err) 
      return done(err);
    state.db = db;
    done();
  })
};

exports.get = function() {
  return state.db;
};

exports.close = function(done) {
  if (state.db) {
    state.db.close(function(err, result) {
      state.db = null;
      state.mode = null;
      done(err);
    });
  }
};

exports.collection = function(name) {
  return state.db.collection(name);
};

exports.lastUpdatedDate = function(lastUpdated, id, cb) {
  if (lastUpdated) {
    cb(lastUpdated);
  } else {
    state.db.collection('settingsdb').findOne({'id': id}, function (err, result) {
      if (result && result.lastUpdated) {
        lastUpdated = moment(result.lastUpdated).toDate();
        cb(lastUpdated);
      } else {
        cb(null);
      }
    });
  }
};

exports.setLastUpdatedDate = function(id, cb) {
  state.db.collection('settingsdb').updateOne({'id': id}, {
    'id': id, 
    'lastUpdated': moment().toISOString(),
    }, {upsert: true}, function(err, results) {
      if (err) {
        console.log('last update date error', id, err);
      }
      cb(err, results)
    });
};