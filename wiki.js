var http = require('axios');

var API = 'https://en.wikipedia.org/w/api.php';

function get(term) {

  return http.get(API + '/all', {
    params: {
      format: 'json',
      action: 'query',
      exintro: '',
      explaintext: '',
      prop: 'extracts',
      titles: term
    }
  });
}

function getImage(place) {
  return http.get(API, {
    params: {
      format: 'json',
      action: 'query',
      pithumbsize: 700,
      prop: 'pageimages',
      titles: place
    }
  });
}

exports.get = get;
exports.getImage = getImage;