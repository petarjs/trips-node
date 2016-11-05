var http = require('axios');

var API = 'https://restcountries.eu/rest/v1';

function getAll() {
  return http.get(API + '/all');
}

exports.getAll = getAll;