const express = require('express')
const { createHash } = require('crypto');
const app = express()
const axios = require('axios');

app.use(express.json())

const cacheService = require("express-api-cache");
const cache = cacheService.cache;


const db = new Map();

const REST_PORT = 3001
const ENDPOINT = 'https://gutendex.com/books/?search=';
const QUERY_LIMIT = 10;
const QUERY_STORAGE_LIMIT = 3;

// REST endpoints

// 
app.get('/api/books', cache("2 minutes"), async (req, res, next) => {
  let query = req.query?.q;

  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS')

  if (query?.length > QUERY_LIMIT) {
    return res.status(414).json({
      message: "Query is too long. Use query on POST method",
      url: `http://${req.headers.host}/api/books/query`
    })
  }

  try {
    const books = await axios(ENDPOINT + query);

    res.json(
      {
        books: books.data.results
      }
    )
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      code: 123,
      message: "Upstream not responding"
    })

  }
})

app.post('/api/books/query', (req, res, next) => {
  let query = req.body?.q;

  res.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');

  if (!query) {
    return res.status(400).json({
      message: "Query is missing",
    })
  }

  if (query?.length <= QUERY_LIMIT) {
    return res.status(400).json({
      message: "Query is too short. Use query on GET method",
      url: `http://${req.headers.host}/api/books?q=${query}`
    })
  }

  let queryHash = createHash('sha256').update(query).digest('hex');
  res.set('Location', `http://${req.headers.host}/api/books/query/${queryHash}`);

  if (db.has(queryHash)) {
    res.status(200).json({ url: `http://${req.headers.host}/api/books/query/${queryHash}` });
  } else {

    if (db.size >= QUERY_STORAGE_LIMIT) {
      db.delete(db.entries().next().value[0])
    }

    db.set(queryHash, query);
    res.status(201).json({ url: `http://${req.headers.host}/api/books/query/${queryHash}` });
  }
})

app.get('/api/books/query/:queryId', cache("2 minutes"), async (req, res, next) => {
  let query = req.params.queryId;

  res.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');

  if (db.has(query)) {
    try {
      const books = await axios(ENDPOINT + db.get(query))

      res.json(
        {
          books: books.data.results
        }
      )
    } catch (err) {
      console.error(err.message);
      res.status(500).json({
        code: 123,
        message: "Upstream not responding"
      })

    }
  } else {
    res.status(404).json({
      message: "Query not found. Generate a new one on POST method",
      url: `http://${req.headers.host}/api/books/query`
    })
  }
})

app.listen(REST_PORT, () => {
  console.log(`REST listening on ${REST_PORT}`)
})

