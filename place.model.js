var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var PlaceSchema = new Schema({
  place: Object,
  placeDetails: Object,
  weather: Object,
  image: Object
});

var Place = mongoose.model('Place', PlaceSchema);

exports.model = Place;