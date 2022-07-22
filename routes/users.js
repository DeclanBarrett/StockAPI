var express = require('express');
var router = express.Router();

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Register
router.post('/register', function (req, res, next) {

  const email = req.body.email;
  const password = req.body.password;

  // Determine if input is valid
  if (!email || !password) {
    res.status(400).json({
      error: true,
      message: "Request body incomplete - email and password needed"
    })
    return;
  }
  // Determine if user already exists
  const queryUsers = req.db.from("users").select("*").where("email", "=", email);
  queryUsers
    .then((users) => {
      if (users.length > 0) {
        res.status(409).json({
          error: true,
          message: "User already exists!"
        })
        return;
      }

      // Insert user into DB
      const saltRounds = 10;
      const hash = bcrypt.hashSync(password, saltRounds);
      return req.db.from("users").insert({ email, hash });

    })
    .then(() => {
      res.status(201).json({
        success: true,
        message: "User created"
      });
    })
})

// Login
router.post('/login', function (req, res, next) {
  
  // Retrieve email and password from req.body
  const secretKey = "FullMarksPlease";
  const email = req.body.email;
  const password = req.body.password;

  // Determine if input is valid
  if (!email || !password) {
    res.status(400).json({
      error: true,
      message: "Request body incomplete - email and password are needed"
    })
    return;
  }

  // Determine if user exists
  const queryUsers = req.db.from("users").select("*").where("email", "=", email);
  queryUsers
    .then((users) => {
      if (users.length === 0) {
        throw "Incorrect email or password";
      }

      // Compare password hashes
      const user = users[0];
      return bcrypt.compare(password, user.hash)
    })
    .then((match) => {
      if (!match) {
        throw "Incorrect email or password";
      }

      // Generate and send key
      const expires_in = 60 * 60 * 24; //24 Hours
      const exp = Math.floor(Date.now() / 1000) + expires_in;
      const token = jwt.sign({ email, exp }, secretKey);
      res.status(200).json({ token_type: "Bearer", token, expires_in });
      return;
    })
    .catch((err) => {
      res.status(401).json({
        error: true,
        message: err
      })
    });
})

module.exports = router;
