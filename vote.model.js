var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var VoteSchema = new Schema({
  user: { type: ObjectId, ref: 'User'},
  place: { type: ObjectId, ref: 'Place'},
  group: { type: ObjectId, ref: 'Group'},
  vote: Boolean
});

var Vote = mongoose.model('Vote', VoteSchema);

exports.model = Vote;