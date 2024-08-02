const express = require('express')
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const fs = require('fs');
const shortid = require('shortid');

const app = express();


app.use(express.static('./public'))
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'my-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
  }));

app.get('/', function(req, res) {
const user = req.session.user;
const role = req.session.role;

if (user && role==='coordinator') {
    res.sendFile(path.join(__dirname, '/views/coordinator/coordinatorhome.html'));
    } else {
    res.sendFile(path.join(__dirname, '/views/index.html'));
    }
});

app.get('/getbuses', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'data', 'userbuses.json');
  const user = req.session.user;
  
  // Read the file asynchronously
  fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
          console.error(err);
          res.status(500).send('Internal Server Error');
      } else {
          try {
              // Parse the JSON data
              const jsonData = JSON.parse(data);
              // Access user-specific data
              const userData = jsonData[user];
              // Send the user's data to the client
              res.json(userData);
          } catch (parseError) {
              console.error('Error parsing JSON:', parseError);
              res.status(500).send('Internal Server Error');
          }
      }
  });
});


  app.delete('/insertTime/:busId/:time/:busStop', (req, res) => {
    const busId = req.params.busId;
    const time = req.params.time;
    const busStop = req.params.busStop;
    // read existing data from buses.json
    const data = JSON.parse(fs.readFileSync('public/data/buses.json', 'utf8'));
  
    // Find the bus object with the given busId
    const bus = data[busId];
  
    // Find the route array within that bus object
    const route = bus.route;
  
    const index = route.findIndex(routeData => routeData.busstop === busStop);
  
    route[index].atime = time;
  
    // write updated data to buses.json
    fs.writeFileSync('public/data/buses.json', JSON.stringify(data));
    
    // send response to client on successful deletion and reload page
    res.status(200).sendFile(path.join(__dirname, '/views/coordinator/coordinatorhome.html'));
  });

module.exports=app