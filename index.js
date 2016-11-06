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
var weatherApi = require('./weather');
var wikiApi = require('./wiki');
var _ = require('lodash');
var ObjectId = require('mongodb').ObjectId;
var customSearchApi = require('./custom-search');

var OPEN_WEATHER_API_KEY = process.env.OPEN_WEATHER_API_KEY;
console.log('API KEY', process.env.GOOGLE_PLACES_API_KEY)
console.log('OPEN WEATHER API KEY', process.env.OPEN_WEATHER_API_KEY)

var Place = require('./place.model').model;
var User = require('./user.model').model;
var Group = require('./group.model').model;
var Vote = require('./vote.model').model;

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

function nocache(req, res, next) {
  res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  res.header('Expires', '-1');
  res.header('Pragma', 'no-cache');
  next();
}

app.use(nocache);

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
    name: req.body.name,
    password: req.body.password
  }, function(err, user) {

    if (err) throw err;

    if (!user) {
      res.json({ success: false, message: 'Authentication failed. User not found.' });
    } else if (user) {

      // check if password matches
      if (user.password != req.body.password) {
        console.log(user, req.body.password);
        res.json({ success: false, message: 'Authentication failed. Wrong password.' });
      } else {

        // if user is found and password is right
        // create a token
        var token = jwt.sign(user, app.get('superSecret'));

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

app.use('/api',function(req, res, next) {

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
          return c.name.toLowerCase().indexOf(req.query.q.toLowerCase()) === 0;
        });

        res.json(_.take(cs, 10));
      }
    })

})

function getPlacePhotoUrl(ref, width) {
  return 'https://maps.googleapis.com/maps/api/place/photo?photoreference=' + ref + '&key=' + process.env.GOOGLE_PLACES_API_KEY + '&maxwidth=' + width;
}

app.post('/api/groups', function(req, res) {
  var country = req.body.country;
  var name = req.body.name;

  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  var decoded = jwt.decode(token, {json: true});
  var userId = decoded._doc._id;
  User.findOne({_id: userId}).then(function(user) {
    placesApi.autocomplete({
      input: country,
    }, function(err, response) {
      var countryData = response.predictions[0];
      placesApi.details({ placeid: countryData.place_id }, function(err, placeDetails) {
        var group = new Group({
          country: country,
          name: name,
          owner: user._id,
          googlePlaceId: countryData.place_id,
          photo: getPlacePhotoUrl(placeDetails.result.photos[0].photo_reference, 800),
          members: [user]
        })
        group.save().then(function(record) {
          res.json(record);
        })
      })
    })
  })

})

app.get('/api/groups', function(req, res) {
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  var decoded = jwt.decode(token, {json: true});
  var userId = decoded._doc._id;

  Group.find({ members: { $in: [userId] }}).then(function(groups) {
    res.json(groups);
  })
})

app.get('/api/groups/:id', function(req, res) {
  var groupId = req.params.id;

  Group
    .findOne({ _id: groupId })
    .populate('owner members')
    .then(function(group) {
      res.json(group);
    })
})

function getToken(req) {
  var token = req.body.token || req.query.token || req.headers['x-access-token'];
  var decoded = jwt.decode(token, {json: true});
  return decoded._doc._id;
}

app.post('/api/groups/:id/invite', function(req, res) {
  var groupId = req.params.id;
  var username = req.body.username;

  Group
    .findOne({ _id: groupId })
    .populate('owner members')
    .then(function(group) {
      User.findOne({ username: username }, function(err, user) {
        group.members.push(user._id);
        group.save().then(function(record) {
          Group
            .findOne({ _id: groupId })
            .populate('owner members')
            .then(function(group) {
              res.json(group);
            })
        })
      })
    })
})

var letters = 'ertuiopasdfghjklzcvbnm';
app.get('/api/groups/:id/places/suggestion', function(req, res) {
  var groupId = req.params.id;

  Group.findOne({ '_id': groupId }, function(err, group) {
    var country = group.country;
    getPlace(country)
  });

  function getPlace(country) {
    placesApi.autocomplete({
      input: country + ' ' + _.sample(letters),
      types: ['(cities)'],
    }, function(err, response) {
      var place = _.sample(_.take(response.predictions, 50));
      if(!place || !response.predictions.length) {
        getPlace(country);
        return;
      }
      var placeName = place.structured_formatting.main_text;
      weatherApi.get({ city: placeName, count: 5, appId: OPEN_WEATHER_API_KEY }).then(function(weather) {
        placesApi.details({ placeid: place.place_id }, function(err, placeDetails) {
          _.each(weather.data.list, function(day) {
            day.weather[0].iconUrl = 'http://openweathermap.org/img/w/' + day.weather[0].icon + '.png';
          })

          wikiApi.getImage(placeName).then(function(resultObj) {
            var pages = resultObj.data.query.pages;
            var first = _.first(_.keys(pages));
            var imageObjectWiki = pages[first];
            
            console.log(imageObjectWiki)
            var tryImage = '';
            if(imageObjectWiki && imageObjectWiki.thumbnail && imageObjectWiki.thumbnail.source) {
              tryImage = imageObjectWiki.thumbnail.source;
            }
            
            var placeObj = new Place({
              place: place,
              placeDetails: placeDetails.result,
              weather: weather.data,
              image: tryImage
            });
            placeObj.save().then(function(place2) {
              res.json(place2);
            })
          })

        });
      }).catch(function(err) {
        res.json(err)
      })
    });
  }
})

app.post('/api/groups/:id/vote', function(req, res) {
  var groupId = req.params.id;
  var votedFor = req.body.vote;
  var placeId = req.body.placeId;
  var userId = getToken(req);

  var vote = new Vote({
    group: groupId,
    vote: votedFor,
    place: placeId,
    user: userId
  })

  vote.save({validateBeforeSave: false}).then(function(newVote) {
    res.json(newVote);
  })
})

app.get('/api/groups/:id/votes', function(req, res) {
  var groupId = req.params.id;

  Vote
    .find({ group: groupId })
    .populate('group group.members place user')
    .then(function(votes) {
      res.json(votes);
    })
})

app.listen(3000, function () {
  console.log('App listening on port 3000!');
});