// =======================
// Import Libraries
// =======================
var express = require("express");
var http = require('http');
var hbs = require("hbs");
var io = require('socket.io');
var hbsutils = require("hbs-utils")(hbs);
var compress = require("compression");
var pg = require('pg')
var format = require('pg-format')

var db_ticker_config = {
  host: 'bitfinex.ccnihvzteajt.us-east-2.rds.amazonaws.com',
  port: '5432',
  user: 'bitfinex', // name of the user account
  password: 'bitfinex',
  database: 'ticker', // name of the database
  max: 20, // set pool max size to 20 
  min: 4, // set min pool size to 4 
  idleTimeoutMillis: 5000, // close idle clients after 1 second 
  connectionTimeoutMillis: 0, // return an error after 1 second if connection could not be established
}
var db_trades_config = {
  host: 'bitfinex.ccnihvzteajt.us-east-2.rds.amazonaws.com',
  port: '5432',
  user: 'bitfinex', // name of the user account
  password: 'bitfinex',
  database: 'trades', // name of the database
  max: 20, // set pool max size to 20 
  min: 4, // set min pool size to 4 
  idleTimeoutMillis: 5000, // close idle clients after 1 second 
  connectionTimeoutMillis: 0, // return an error after 1 second if connection could not be established
}
var db_book_config = {
  host: 'bitfinex.ccnihvzteajt.us-east-2.rds.amazonaws.com',
  port: '5432',
  user: 'bitfinex', // name of the user account
  password: 'bitfinex',
  database: 'book', // name of the database
  max: 20, // set pool max size to 20 
  min: 4, // set min pool size to 4 
  idleTimeoutMillis: 5000, // close idle clients after 1 second 
  connectionTimeoutMillis: 0, // return an error after 1 second if connection could not be established
}



var ticker_pool = new pg.Pool(db_ticker_config)
var tickerClient = null
var global_ticker_data = [];

setInterval( function() {
  if(global_ticker_data.length == 0) return;
  ticker_pool.connect(function (err, client, done) {
    if (err) console.log(err)
    tickerClient = client
    var insertQuery = format('INSERT INTO public.ticker("PAIR", "DateCreated", "BID", "BID_SIZE", "ASK", "ASK_SIZE", "DAILY_CHANGE", "DAILY_CHANGE_PERC", "LAST_PRICE", "VOLUME", "HIGH", "LOW") VALUES %L', global_ticker_data)
    tickerClient.query(insertQuery, function (err, result) {
      global_ticker_data.length = 0;
      if(g_socket) {
        g_socket.emit('clear_ticker');
      }
      done()
      if (err) {
        console.log(err)
      }
    })
  })
}, 1000 * 60 * 1);



var trades_pool = new pg.Pool(db_trades_config)
var tradesClient = null
var global_trades_data = [];

setInterval( function() {
  if(global_trades_data.length == 0) return;
  trades_pool.connect(function (err, client, done) {
    if (err) console.log(err)
    tradesClient = client
    var insertQuery = format('INSERT INTO public.trades("PAIR", "DateCreated", "Event", "EventID", "MTS", "AMOUNT", "PRICE") VALUES %L', global_trades_data)
    tradesClient.query(insertQuery, function (err, result) {
      global_trades_data.length = 0;
      if(g_socket) {
        g_socket.emit('clear_trades');
      }
      done()
      if (err) {
        console.log(err)
      }
    })
  })
}, 1000 * 60 * 1);



var app = express();

global.__root = __dirname + "/"; // eslint-disable-line

process.on("uncaughtException", function (err) {
	console.log("Caught exception: " + err); // eslint-disable-line
});

// =======================
// Expressjs Configuration
// =======================
app.use(compress());
app.use("/assets", express.static(__dirname + "/assets")); // eslint-disable-line
app.use("/public", express.static(__dirname + "/public")); // eslint-disable-line

hbs.registerPartials(__dirname + "/views/partials"); // eslint-disable-line
hbsutils.registerWatchedPartials(__dirname + "/views/partials"); // eslint-disable-line

app.set("view engine", "hbs");
app.set("views", __dirname + "/views"); // eslint-disable-line
app.disable("x-powered-by");

// =======================
// Routes
// =======================
require(__root + "node_scripts/routes/routes").routes(app); // eslint-disable-line

// =======================
// Launch Application
// =======================
var PORT = 3010;
var server =http.createServer(app).listen(PORT);
io = io.listen(server);

var g_socket = null;

io.sockets.on("connection", (socket) => {
	g_socket = socket;
});

// forever connect

let connected = false
let connecting = false

// ------------- Bitfinex ------------

// order preparation 
var BOOKS = {};

const BFX = require('bitfinex-api-node')

const API_KEY = null;
const API_SECRET = null;

const opts = {
  version: 2,
  transform: true
}

let bws;

const pairs = ["BTCUSD","ETHUSD","ETHBTC","XMRUSD","XMRBTC","LTCUSD","LTCBTC","BCHUSD","BCHBTC","BCHETH","OMGUSD","OMGBTC","OMGETH","XRPUSD","XRPBTC","ZECUSD","ZECBTC","ETCUSD","ETCBTC","EOSUSD","EOSBTC","EOSETH","RRTUSD","RRTBTC","SANUSD","SANBTC","SANETH","BCUUSD","BCUBTC","BCCUSD","BCCBTC"];
// "IOTAUSD","IOTABTC","IOTAETH","DASHUSD","DASHBTC"

pairs.forEach((pair) => {
  var newObj = {};
  newObj.bids = {};
  newObj.asks = {};
  newObj.psnap = {};
  newObj.mcnt = 0;
  BOOKS[pair] = newObj;
});

connect = () => {

  if (connecting || connected) return
  connecting = true

  bws = new BFX(API_KEY, API_SECRET, opts).ws

  bws.on('open', () => {

    connecting = false
    connected = true
    
    pairs.forEach((pair) => {
      bws.subscribeOrderBook(pair)
      bws.subscribeTicker(pair)
      bws.subscribeTrades(pair)
    })
  })

  bws.on('close', () => {
    connecting = false
    connected = false
  })


  bws.on('orderbook', (pair, order) => {
    // console.log('Orderbook:', pair, order)

    pair = pair.substring(1); // remove tBTCUSD -> BTCUSD

    var booklist = [];
    if(order.constructor === Array) {
      booklist = order.concat();
    } else {
      booklist.push(order);
    }

    if(BOOKS[pair].mcnt == 0) {
      booklist.forEach((data) => {
        const side = data.AMOUNT >= 0 ? 'bids' : 'asks'
        data.AMOUNT = Math.abs(data.AMOUNT)
        BOOKS[pair][side][data.PRICE] = data
      })
    } else {
      booklist.forEach((data) => {
        if (!data.COUNT) {
          let found = true
          if (data.AMOUNT > 0) {
            if (BOOKS[pair]['bids'][data.PRICE]) {
              delete BOOKS[pair]['bids'][data.PRICE]
            } else {
              found = false
            }
          } else if (data.AMOUNT < 0) {
            if (BOOKS[pair]['asks'][data.PRICE]) {
              delete BOOKS[pair]['asks'][data.PRICE]
            } else {
              found = false
            }
          }
          if (!found) {
          }
        } else {
          let side = data.AMOUNT >= 0 ? 'bids' : 'asks'
          data.AMOUNT = Math.abs(data.AMOUNT)
          BOOKS[pair][side][data.PRICE] = data
        }
      })
    }

    checkSide(pair, 'bids');
    checkSide(pair, 'asks');

    BOOKS[pair].mcnt++
  })

  bws.on('trade', (pair, trade) => {
    // console.log('Trade:', pair, trade)
    pair = pair.substring(1); // remove tBTCUSD -> BTCUSD

    if(g_socket) {
      g_socket.emit("trade", { pair, trade });
    }

    if(trade[0]=='tu') {
      global_trades_data.push([ pair, new Date(), trade[0], trade[1].ID, trade[1].MTS, trade[1].AMOUNT, trade[1].PRICE ]);
    }
  })

  bws.on('ticker', (pair, ticker) => {
    // console.log('Ticker:', pair, ticker)
    pair = pair.substring(1); // remove tBTCUSD -> BTCUSD
    
    if(g_socket) {
    	g_socket.emit("ticker", { pair, ticker });
    }

    global_ticker_data.push([ pair, new Date(), ticker.BID, ticker.BID_SIZE, ticker.ASK, ticker.ASK_SIZE, ticker.DAILY_CHANGE, ticker.DAILY_CHANGE_PERC, ticker.LAST_PRICE, ticker.VOLUME, ticker.HIGH, ticker.LOW ]);
  })

  bws.on('error', console.error)
}

setInterval(function() {
  if (connected) return
  connect()
}, 5000)



checkSide = (pair, side) => {
  let sbook = BOOKS[pair][side]
  let bprices = Object.keys(sbook)

  let prices = bprices.sort(function(a, b) {
    if (side === 'bids') {
      return +a >= +b ? -1 : 1
    } else {
      return +a <= +b ? -1 : 1
    }
  })

  BOOKS[pair].psnap[side] = prices
  //console.log("num price points", side, prices.length)
}

emitBookOrder = (pair) => {
  if(BOOKS[pair] != undefined && BOOKS[pair].bids && BOOKS[pair].asks && g_socket) g_socket.emit("orderbook", { pair, book: { bids: BOOKS[pair].bids, asks: BOOKS[pair].asks } } )
}

setInterval(function() {
  pairs.forEach((pair) => {
    emitBookOrder(pair)
  })
}, 1000*60)



var book_pool = new pg.Pool(db_book_config)
var bookClient = null 
saveBookOrder = (pair) => {
  // console.log(BOOKS[pair]);
  if(!BOOKS[pair]) return;

  book_pool.connect(function (err, client, done) {
    if (err) console.log(err)
    bookClient = client
    var insertQuery = format('INSERT INTO public.book("PAIR", "DateCreated", "BookInstance") VALUES %L', [ [ pair, new Date(), BOOKS[pair] ] ])
    bookClient.query(insertQuery, function (err, result) {
      done()
      if (err) {
        console.log(err)
      }
    })
  })
}

setInterval(function() {
  pairs.forEach((pair) => {
    saveBookOrder(pair);
  })
  if(g_socket) {
    g_socket.emit('clear_book');
  }
}, 1000 * 60 * 10)