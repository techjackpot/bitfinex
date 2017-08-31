// =======================
// Import Libraries
// =======================
var express = require("express");
var http = require('http');
var hbs = require("hbs");
var io = require('socket.io');
var hbsutils = require("hbs-utils")(hbs);
var compress = require("compression");

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



// ------------- Bitfinex ------------

// order preparation 
var BOOK = { bids: {}, asks: {}, psnap: {}, mcnt: 0 };

const BFX = require('bitfinex-api-node')

const API_KEY = null;
const API_SECRET = null;

const opts = {
  version: 2,
  transform: true
}

const bws = new BFX(API_KEY, API_SECRET, opts).ws

bws.on('auth', () => {
  // emitted after .auth()
  // needed for private api endpoints

  console.log('authenticated')
  // bws.submitOrder ...
})

bws.on('open', () => {
  
  var pairs = ["BTCUSD","ETHUSD","ETHBTC","XMRUSD","XMRBTC","LTCUSD","LTCBTC","BCHUSD","BCHBTC","BCHETH","OMGUSD","OMGBTC","OMGETH","XRPUSD","XRPBTC","ZECUSD","ZECBTC","ETCUSD","ETCBTC","EOSUSD","EOSBTC","EOSETH","RRTUSD","RRTBTC","SANUSD","SANBTC","SANETH","BCUUSD","BCUBTC","BCCUSD","BCCBTC"];
  // "IOTAUSD","IOTABTC","IOTAETH","DASHUSD","DASHBTC"
  pairs.forEach((pair) => {
    bws.subscribeOrderBook(pair)
    bws.subscribeTicker(pair)
    bws.subscribeTrades(pair)
  })

  // authenticate
  // bws.auth()
})

function checkSide(side) {
  let sbook = BOOK[side]
  let bprices = Object.keys(sbook)

  let prices = bprices.sort(function(a, b) {
    if (side === 'bids') {
      return +a >= +b ? -1 : 1
    } else {
      return +a <= +b ? -1 : 1
    }
  })

  BOOK.psnap[side] = prices
  //console.log("num price points", side, prices.length)
}

bws.on('orderbook', (pair, order) => {
  // console.log('Order book:', pair, order);

  var data = Object.assign({}, order );

  if(BOOK.mcnt == 0) {
    const side = data.AMOUNT >= 0 ? 'bids' : 'asks'
    data.AMOUNT = Math.abs(data.AMOUNT)
    BOOK[side][data.PRICE] = data
  } else {
    if (!data.COUNT) {
      let found = true
      if (data.AMOUNT > 0) {
        if (BOOK['bids'][data.PRICE]) {
          delete BOOK['bids'][data.PRICE]
        } else {
          found = false
        }
      } else if (data.AMOUNT < 0) {
        if (BOOK['asks'][data.PRICE]) {
          delete BOOK['asks'][data.PRICE]
        } else {
          found = false
        }
      }
      if (!found) {
        // fs.appendFileSync(logfile, "[" + moment().format() + "] " + pair + " | " + JSON.stringify(pp) + " BOOK delete fail side not found\n")
      }
    } else {
      let side = data.AMOUNT >= 0 ? 'bids' : 'asks'
      data.AMOUNT = Math.abs(data.AMOUNT)
      BOOK[side][data.PRICE] = data
    }
  }

  checkSide('bids');
  checkSide('asks');

  BOOK.mcnt++
  // checkCross(msg)
  if(BOOK.mcnt%1000 == 0) {
    // g_socket.emit("orderbook", { pair, book: Object.assign({ bids: BOOK.bids, asks: BOOK.asks }, order) } )
    g_socket.emit("orderbook", { pair, book: { bids: BOOK.bids, asks: BOOK.asks } } )
  }
})

bws.on('trade', (pair, trade) => {
  // console.log('Trade:', pair, trade)
  if(g_socket) {
    g_socket.emit("trade", { pair, trade });
  }
})

bws.on('ticker', (pair, ticker) => {
  // console.log('Ticker:', pair, ticker)
  if(g_socket) {
  	g_socket.emit("ticker", { pair, ticker });
  }
})

bws.on('error', console.error)

