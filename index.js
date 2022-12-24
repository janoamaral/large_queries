const express = require('express')
const { createHash } = require('crypto');
const app = express()
const axios = require('axios');
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
const ExpressCache = require('express-cache-middleware')
const cacheManager = require('cache-manager')

const cacheMiddleware = new ExpressCache(
  cacheManager.caching({
    store: 'memory', max: 10000, ttl: 3600
  })
)

cacheMiddleware.attach(app)


const REST_PORT = 3001

const db = new Map();

const ENDPOINT = 'https://gutendex.com/books/?search=';

// REST endpoints

// 
app.get('/api/books', async (req, res, next) => {
  let query = req.query?.q;

  res.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')

  if (query?.length > 10) {
    return res.status(414).json({
      message: "Query is too long. Use query on POST method",
      postURL: `http://${req.headers.host}/api/books`
    })
  }

  try {
    const books = await axios(ENDPOINT + query)

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

app.post('/api/books', (req, res, next) => {
  let query = req.body?.q;

  res.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')

  if (!query) {
    return res.status(400).json({
      message: "Query is missing",
    })
  }

  let queryHash = createHash('sha256').update(query).digest('hex');
  res.set('Location', `http://${req.headers.host}/api/books/${queryHash}`)

  if (db.has(queryHash)) {
    res.status(200).json({ url: db.get(queryHash) })
  } else {
    db.set(queryHash, query)
    res.status(201).json({ url: `http://${req.headers.host}/api/books/${queryHash}` })
  }
})

app.get('/api/books/:queryId', async (req, res, next) => {
  let query = req.params.queryId;

  res.set('Access-Control-Allow-Methods', 'GET, OPTIONS')

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
      postURL: `http://${req.headers.host}/api/books`
    })
  }
})

app.listen(REST_PORT, () => {
  console.log(`REST listening on ${REST_PORT}`)
})

