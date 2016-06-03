var moment = require('moment');

exports.monthRange = function(page, cb) {
  var today = moment();
  if (page > 0) {
    today.subtract(page, 'months');
  }

  var startDate = today.startOf('month');
  var endDate = moment(startDate).endOf('month');
  
  cb(startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD'));
};

