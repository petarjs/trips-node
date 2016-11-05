var express = require('express');
var mongoose = require('mongoose');
var helmet = require('helmet')
var bodyParser = require('body-parser');
var RateLimit = require('express-rate-limit');
var cors = require('cors');
var morgan      = require('morgan');
var jwt    = require('jsonwebtoken');
var GoogleLocations = require('google-locations');
var placesApi = new GoogleLocations(process.env.GOOGLE_PLACES_API_KEY);
var countriesApi = require('./countries');
var _ = require('lodash');

console.log('API KEY', process.env.GOOGLE_PLACES_API_KEY)

var Place = require('./place.model').model;
var User = require('./user.model').model;

mongoose.Promise = require('bluebird');
mongoose.connect('mongodb://localhost/trips');

var app = express();

app.set('superSecret', '2314431211');

app.use(bodyParser.json());
app.use(cors());
app.use(helmet({
  hsts: false
}));

app.use(morgan('dev'));

var limiter = new RateLimit({
  windowMs: 15*60*1000,
  max: 1000,
  delayMs: 0
});
 
app.use(limiter);

app.get('/', function (req, res) {
  res.send('Hello World!');
});

app.post('/register', function(req, res) {
  var u = new User(req.body);
  u.save(function(err) {
    if(err) return res.json({ error: true });

    return res.json({ success: true });
  })
});

app.post('/authenticate', function(req, res) {

  // find the user
  User.findOne({
    name: req.body.name
  }, function(err, user) {

    if (err) throw err;

    if (!user) {
      res.json({ success: false, message: 'Authentication failed. User not found.' });
    } else if (user) {

      // check if password matches
      if (user.password != req.body.password) {
        res.json({ success: false, message: 'Authentication failed. Wrong password.' });
      } else {

        // if user is found and password is right
        // create a token
        var token = jwt.sign(user, app.get('superSecret'), {});

        // return the information including token as JSON
        res.json({
          success: true,
          message: 'Enjoy your token!',
          token: token
        });
      }
    }
  });
});

app.use(function(req, res, next) {

  // check header or url parameters or post parameters for token
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  // decode token
  if (token) {

    // verifies secret and checks exp
    jwt.verify(token, app.get('superSecret'), function(err, decoded) {      
      if (err) {
        return res.json({ success: false, message: 'Failed to authenticate token.' });    
      } else {
        // if everything is good, save to request for use in other routes
        req.decoded = decoded;
        next();
      }
    });

  } else {

    // if there is no token
    // return an error
    return res.status(403).send({ 
        success: false, 
        message: 'No token provided.' 
    });
    
  }
});

app.get('/place', function(req, res) {
  Place.findByName(req.params.q, function(err, place) {
    res.status(200).json(place);
  });
});

app.get('/api/test', function(req, res) {
  placesApi.autocomplete({
    input: 'Nis Serbia',
    types: '(cities)'
  }, function(err, response) {
    res.json(response);
  })
  // res.json({msg:'serser'})
});

app.get('/api/countries', function(req, res) {
  countriesApi
    .getAll()
    .then(function(countries) {
      if(!req.query.q) {
        res.json(_.take(countries.data, 10));
      } else {
        var cs = _.filter(countries.data, function(c, index) {
          return c.name.toLowerCase().indexOf(req.query.q) === 0;
        });
        
        res.json(cs);
      }
    })

})

app.listen(3000, function () {
  console.log('App listening on port 3000!');
});