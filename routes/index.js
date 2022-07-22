var express = require('express');
var router = express.Router();
const jwt = require('jsonwebtoken');

// GET all symbols
router.get('/symbols', function (req, res, next) {

  // Get industry filter
  const industry = (req.query.industry) ? (req.query.industry) : ""
  if (Object.keys(req.query).length > 0 && !req.query.industry) {
    res.status(400).json({ "error": true, "message": "Invalid query parameter: only 'industry' is permitted" });
    return;
  }

  // Query symbols from database
  req.db.from('stocks').distinct('name', 'symbol', 'industry').where('industry', 'like', `%${industry}%`)
    .then((symbols) => {
      if (symbols.length > 0) {
        res.status(200).json(symbols);
      } else {
        res.status(404).json({ "error": true, "message": "Industry sector not found" });
      }
    })
    .catch((err) => {
      res.status(400).json({ "error": true, "message": "Error executing MySQL query" });
    })
});

// GET specific stock symbol
router.get('/:symbol', function (req, res, next) {
  
  // Error if query present
  if (Object.keys(req.query).length > 0) {
    res.status(400).json({ "error": true, "message": "Date parameters only available on authenticated route /stocks/authed" })
    return;
  }

  // Query symbol data from database
  req.db.from('stocks').select('*').where('symbol', '=', req.params.symbol)
    .then((symbols) => {
      if (symbols.length > 0) {
        res.status(200).json(symbols[0])
      } else {
        res.status(404).json({ "error": true, "message": "No entry for symbol in stocks database" })
      }
    })
    .catch((err) => {
      res.status(400).json({ "error": true, "message": "Error executing MySQL query" })
    });
});

// Authorization
const authorize = (req, res, next) => {

  const authorization = req.headers.authorization;
  const secretKey = "FullMarksPlease";
  let token = null;

  // Retrieve Token
  if (authorization && authorization.split(" ").length === 2) {
    token = authorization.split(" ")[1];
  } else {
    res.status(403).json({ "error": true, "message": "Authorization header not found" });
    return;
  }

  // Verify JWT and check expiration date
  try {
    const decoded = jwt.verify(token, secretKey);
    if (decoded.exp > Date.now()) {
      res.status(403).json({ "error": true, "message": "Authorization header not found" });
      return;
    }
    next();
  } catch (e) {
    res.status(403).json({ "error": true, "message": "Authorization header not found" });
  }
}

// Get stock data - date optional - authenticated route
router.get('/authed/:symbol', authorize, function (req, res, next) {
  
  // Check received queries
  const OneQueryCheck = Object.keys(req.query).length === 1 && (req.query.from || req.query.to); //True when one query is given which is either from or to
  const TwoQueryCheck = Object.keys(req.query).length === 2 && (req.query.from && req.query.to); //True when two query are given which are both from and to
  const NoQueryCheck = Object.keys(req.query).length === 0; //True if their are no query parameters

  // Build Query to send to database
  let query = req.db.from('stocks').select('*').where('symbol', '=', req.params.symbol)

  if (OneQueryCheck) {
    if (req.query.from) {
      query.andWhere('timestamp', '>=', req.query.from);
    }
    if (req.query.to) {
      query.andWhere('timestamp', '<=', req.query.to);
    }

  } else if (TwoQueryCheck) {
    query.andWhere('timestamp', '>=', req.query.from);
    query.andWhere('timestamp', '<=', req.query.to);
  } else if (!NoQueryCheck) {
    res.status(400).json({ "error": true, "message": "Parameters allowed are 'from' and 'to', example: /stocks/authed/AAL?from=2020-03-15" })
    return;
  } else if (NoQueryCheck) {
    query.limit(1);
  }

  // Query database for data
  query
    .then((rows) => {
      if (rows.length === 0) {
        res.status(404).json({ "error": true, "message": "No entries available for query symbol for supplied date range" })
        return;
      } else if (rows.length === 1) {
        res.status(200).json(rows[0])
      } else {
        res.status(200).json(rows)
      }
    })
    .catch((err) => {
      res.status(400).json({ "error": true, "message": "Error executing MySQL query" })
    });

});

router.get('/', function (req, res, next) {
  res.status(400).json({ "error": true, "message": "Request on /stocks must include symbol as path parameter, or alternatively you can hit /stocks/symbols to get all symbols" });
});

module.exports = router;
