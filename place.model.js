var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var PlaceSchema = new Schema({
  name: String,
});

PlaceSchema.statics.findByName = function(name, cb) {
  return { name: 'asdf' };
};

var Place = mongoose.model('Place', PlaceSchema);

exports.model = Place;