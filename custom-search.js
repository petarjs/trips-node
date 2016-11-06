var http = require('axios');

var API = 'https://www.googleapis.com/customsearch/v1';

function get(opts) {
  var q = opts.q;
  var type = opts.type || 'image';
  var key = process.env.GOOGLE_PLACES_API_KEY;
  return http.get(API, {
    params: {
      q: q,
      type: type,
      key: key,
      cx: '015314717082768425375:rulqddgrmug'
    }
  });
}

exports.get = get;