const express = require('express')
const { createHash } = require('crypto');
const app = express()
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
const REST_PORT = 3001

const db = new Map();

// REST endpoints

// 
app.get('/api/test', (req, res, next) => {
  let query = req.query?.q;

  res.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')

  if (query?.length > 10) {
    return res.status(400).json({
      message: "Query is too long. Use query on POST method",
      postURL: `${req.headers.host}/api/test`
    })
  }

  res.json(
    {
      data: query
    }
  )
})

app.post('/api/test', (req, res, next) => {
  let query = req.body?.q;

  res.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')

  if (!query) {
    return res.status(400).json({
      message: "Query is missing",
    })
  }

  let queryHash = createHash('sha256').update(query).digest('hex');

  if (db.has(queryHash)) {
    res.status(200).json({ data: db.get(queryHash) })
  } else {
    db.set(queryHash, query)
    res.status(201).json({ url: `/api/test/${queryHash}` })
  }
})

app.get('/api/test/:queryId', (req, res, next) => {
  let query = req.params.queryId;

  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS')

  if (db.has(query)) {
    res.status(200).json({ data: db.get(query) })
  } else {
    res.status(404).json({
      message: "Query not found. Generate a new one on POST method",
      postURL: `${req.headers.host}/api/test`
    })
  }
})

app.listen(REST_PORT, () => {
  console.log(`REST listening on ${REST_PORT}`)
})

