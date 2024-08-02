const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const fs = require('fs');
const shortid = require('shortid');

const app = express();

app.use(express.static('./public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: 'my-secret-key',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// Common function to validate users
function isValidUser(email, password, role) {
  // read existing data from users.json
  const data = JSON.parse(fs.readFileSync('public/data/users.json', 'utf8'));

  // loop through the data to find a user that matches the email, password, and role
  for (const key in data) {
    const user = data[key];
    if (user.email === email && user.password === password && user.role === role) {
      return true;
    }
  }

  // no matching user found, return false
  return false;
}

// Main route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/index.html'));
});

app.post('/', (req, res) => {
  const { email, password, role } = req.body;

  if (isValidUser(email, password, role)) {
    req.session.user = email;
    req.session.role = role;

    if (role === 'admin')
      res.redirect('/admin');
    else if (role === 'passenger')
      res.redirect('/passenger');
    else if (role === 'coordinator')
      res.redirect('/coordinator');
  } else {
    const alertScript = `
      <script>
          alert('Invalid credentials. Please try again.');
          window.location.href = '/';
      </script>
    `;
    res.send(alertScript);
  }
});

// Coordinator server routes
app.get('/coordinator', (req, res) => {
  const user = req.session.user;
  const role = req.session.role;

  if (user && role === 'coordinator') {
    res.sendFile(path.join(__dirname, 'public/coordinatorhome.html'));
  } else {
    res.sendFile(path.join(__dirname, 'public/index.html'));
  }
});

app.get('/coordinator/getbuses', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'data', 'userbuses.json');
  const user = req.session.user;

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
    } else {
      try {
        const jsonData = JSON.parse(data);
        const userData = jsonData[user];
        res.json(userData);
      } catch (parseError) {
        console.error('Error parsing JSON:', parseError);
        res.status(500).send('Internal Server Error');
      }
    }
  });
});

app.delete('/coordinator/insertTime/:busId/:time/:busStop', (req, res) => {
  const { busId, time, busStop } = req.params;
  const data = JSON.parse(fs.readFileSync('public/data/buses.json', 'utf8'));

  const bus = data[busId];
  const route = bus.route;
  const index = route.findIndex(routeData => routeData.busstop === busStop);

  route[index].atime = time;

  fs.writeFileSync('public/data/buses.json', JSON.stringify(data));
  res.status(200).sendFile(path.join(__dirname, '/views/coordinator/coordinatorhome.html'));
});

// Admin server routes
app.get('/admin', (req, res) => {
  const user = req.session.user;
  const role = req.session.role;

  if (user && role === 'admin') {
    res.sendFile(path.join(__dirname, 'public/adminhome.html'));
  } else {
    res.sendFile(path.join(__dirname, 'public/index.html'));
  }
});

app.get('/admin/adduser', (req, res) => {
  const user = req.session.user;
  const role = req.session.role;

  if (user && role === 'admin') {
    res.sendFile(path.join(__dirname, 'public/adduser.html'));
  } else {
    res.sendFile(path.join(__dirname, 'public/index.html'));
  }
});

app.post('/admin/adduser', (req, res) => {
  const { digitalid, name, role, email, password } = req.body;

  const user = { digitalid, name, role, email, password };

  const data = JSON.parse(fs.readFileSync('public/data/users.json', 'utf8'));
  data[digitalid] = user;
  fs.writeFileSync('public/data/users.json', JSON.stringify(data));

  res.status(200).sendFile(path.join(__dirname, 'public/useradded.html'));
});

app.post('/admin/addnewbus', (req, res) => {
  const { bus_no, time, loc, bus_id } = req.body;

  const userdata = JSON.parse(fs.readFileSync('public/data/userbuses.json', 'utf8'));
  if (!userdata.hasOwnProperty(bus_id)) {
    userdata[bus_id] = [];
  }
  userdata[bus_id].push(bus_no);
  fs.writeFileSync('public/data/userbuses.json', JSON.stringify(userdata));

  const route = time.map((t, index) => ({ time: t, busstop: loc[index] }));
  route.sort((a, b) => (a.time > b.time) ? 1 : -1);

  const data = JSON.parse(fs.readFileSync('public/data/buses.json', 'utf8'));
  data[bus_no] = { route };
  fs.writeFileSync('public/data/buses.json', JSON.stringify(data));

  res.status(200).sendFile(path.join(__dirname, 'public/adminhome.html'));
});

app.delete('/admin/deletebus/:busId', (req, res) => {
  const busId = req.params.busId;
  const data = JSON.parse(fs.readFileSync('public/data/buses.json', 'utf8'));
  delete data[busId];
  fs.writeFileSync('public/data/buses.json', JSON.stringify(data));
  res.status(200).sendFile(path.join(__dirname, 'public/adminhome.html'));
});

app.delete('/admin/resetbus/:busId', (req, res) => {
  const busId = req.params.busId;
  const data = JSON.parse(fs.readFileSync('public/data/buses.json', 'utf8'));

  if (data[busId]) {
    data[busId].route.forEach(stop => {
      stop.atime = null;
    });
    fs.writeFileSync('public/data/buses.json', JSON.stringify(data));
    res.status(200).sendFile(path.join(__dirname, 'public/adminhome.html'));
  } else {
    res.status(404).send('Bus not found');
  }
});

app.delete('/admin/totalresetbuses', (req, res) => {
  const data = JSON.parse(fs.readFileSync('public/data/buses.json', 'utf8'));

  for (const busId in data) {
    if (data.hasOwnProperty(busId)) {
      data[busId].route.forEach(stop => {
        stop.atime = null;
      });
    }
  }

  fs.writeFileSync('public/data/buses.json', JSON.stringify(data));
  res.status(200).sendFile(path.join(__dirname, 'public/adminhome.html'));
});

app.delete('/admin/deletewaypoint/:busId/:busStop', (req, res) => {
  const { busId, busStop } = req.params;
  const data = JSON.parse(fs.readFileSync('public/data/buses.json', 'utf8'));

  const bus = data[busId];
  const route = bus.route;
  const index = route.findIndex((item) => item.busstop === busStop);

  if (index !== -1) {
    route.splice(index, 1);
  }

  fs.writeFileSync('public/data/buses.json', JSON.stringify(data));
  res.status(200).sendFile(path.join(__dirname, 'public/adminhome.html'));
});

app.delete('/admin/insertwaypoint/:busId/:time/:busStop', (req, res) => {
  const { busId, time, busStop } = req.params;
  const data = JSON.parse(fs.readFileSync('public/data/buses.json', 'utf8'));

  const bus = data[busId];
  const route = bus.route;
  route.push({ "time": time, "busstop": busStop });
  route.sort((a, b) => (a.time > b.time) ? 1 : -1);

  fs.writeFileSync('public/data/buses.json', JSON.stringify(data));
  res.status(200).sendFile(path.join(__dirname, 'public/adminhome.html'));
});

app.get('/passenger', (req, res) => {
  const user = req.session.user;
  const role = req.session.role;

  if (user && role === 'passenger') {
    res.sendFile(path.join(__dirname, 'public/passengerhome.html'));
  } else {
    res.sendFile(path.join(__dirname, 'public/index.html'));
  }
});

app.listen(8085, () => {
  console.log('server is listening on 8085');
});
