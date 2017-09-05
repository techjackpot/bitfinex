import $ from "jquery";

import "az-styles";
import "bootstrap";
import io from 'socket.io-client';

$(document).ready(function () {

	var localeOptions = {  
	    weekday: "long", year: "numeric", month: "short",  
	    day: "numeric", hour: "2-digit", minute: "2-digit"  
	};  

	var socket = io.connect("/"); 

	socket.on("trade", (data) => {
		// console.log(data);
		
		var new_element = $('<div class="log"></div>').append($('<div class="type"></div>').html(data.pair)).append($('<span class="time"></span>').html(new Date().toLocaleTimeString("en-us", localeOptions))).append($('<div class="content"></div>').html(JSON.stringify(data.trade, null, ' ')));
		$("#trade-log-container").prepend(new_element);
	})

	socket.on("ticker", (data) => {
		// console.log(data);
		
		var new_element = $('<div class="log"></div>').append($('<div class="type"></div>').html(data.pair)).append($('<span class="time"></span>').html(new Date().toLocaleTimeString("en-us", localeOptions))).append($('<div class="content"></div>').html(JSON.stringify(data.ticker, null, ' ')));
		$("#ticker-log-container").prepend(new_element);
	})

	socket.on("orderbook", (data) => {
		// console.log(data);
		
		var new_element = $('<div class="log"></div>').append($('<div class="type"></div>').html(data.pair)).append($('<span class="time"></span>').html(new Date().toLocaleTimeString("en-us", localeOptions))).append($('<div class="content"></div>').html(JSON.stringify(data.book, null, ' ')));
		$("#book-log-container").prepend(new_element);
	})

	$(".btn-clear").on('click', function() {
		$(this).parents(".component").find(".logs").empty();
	})


	socket.on('clear_ticker', () => {
		$("#ticker-log-container").empty();
		$(".status-list").append($('<h4 class="ticker-status">Ticker saved.</h4>'));
		setTimeout(function() {
			$(".ticker-status").remove();
		}, 3000);
	})

	socket.on('clear_trades', () => {
		$("#trade-log-container").empty();
		$(".status-list").append($('<h4 class="trade-status">Trades saved.</h4>'));
		setTimeout(function() {
			$(".trade-status").remove();
		}, 3000);
	})

	socket.on('clear_book', () => {
		$("#book-log-container").empty();
		$(".status-list").append($('<h4 class="book-status">BookInstance saved.</h4>'));
		setTimeout(function() {
			$(".book-status").remove();
		}, 3000);
	})
});
