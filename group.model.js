var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var GroupSchema = new Schema({
  name: String,
  country: String,
  owner: { type: ObjectId, ref: 'User' },
  photo: String,
  members: [{ type: ObjectId, ref: 'User' }]
});

var Group = mongoose.model('Group', GroupSchema);

exports.model = Group;