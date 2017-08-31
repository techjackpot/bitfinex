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

	$(".btn-clear").on('click', function() {
		$(this).parents(".component").find(".logs").empty();
	})
});
