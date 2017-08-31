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
  bws.subscribeTicker('BTCUSD')
  // bws.subscribeOrderBook('BTCUSD')
  bws.subscribeTrades('BTCUSD')

  // authenticate
  // bws.auth()
})

bws.on('orderbook', (pair, book) => {
  // console.log('Order book:', book)
})

bws.on('trade', (pair, trade) => {
  console.log('Trade:', trade)
  if(g_socket) {
    console.log('trade emit');
    g_socket.emit("trade", { pair, trade });
  }
})

bws.on('ticker', (pair, ticker) => {
  // console.log('Ticker:', ticker)
  if(g_socket) {
  	g_socket.emit("ticker", { pair, ticker });
  }
})

bws.on('error', console.error)
