var moment = require('moment');

exports.monthRange = function(page, cb) {
  var today = moment();
  if (page > 0) {
    today.subtract(page, 'months');
  }

  var startDate = today.startOf('month');
  var endDate = moment(startDate).endOf('month');
  
  cb(startDate.toISOString(), endDate.toISOString());
};


exports.lastYearRange = function(cb) {
  var startDate = moment().subtract(1, 'years');
  var endDate = moment();
  
  cb(startDate.toISOString(), endDate.toISOString());
};

