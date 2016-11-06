var http = require('axios');

var API = 'https://en.wikipedia.org/w/api.php';

function get(term) {

  return http.get(API + '/all', {
    params: {
      format: 'json',
      action: 'query',
      prop: 'extracts',
      titles: term
    }
  });
}

exports.getAll = getAll;