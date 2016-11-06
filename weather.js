var http = require('axios');

var API = 'http://api.openweathermap.org/data/2.5/forecast';

function get(opts) {
  var city = opts.city;
  var cnt = opts.count;
  var units = 'metric';
  var appId = opts.appId

  var url = API + '/daily' + '?units=' + units + '&q=' + city + '&cnt=' + cnt + '&appid=' + appId;

  return http.get(url);
}

exports.get = get;