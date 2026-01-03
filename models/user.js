const mongoose = require('mongoose');
const Schema = mongoose.Schema;
// Normalize import so it works whether the module exports the function directly or under .default
const _passportLocalMongoose = require('passport-local-mongoose');
const passportLocalMongoose =
  typeof _passportLocalMongoose === 'function'
    ? _passportLocalMongoose
    : _passportLocalMongoose.default || _passportLocalMongoose;

const UserSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
});

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', UserSchema);
