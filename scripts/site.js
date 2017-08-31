import $ from "jquery";

import "az-styles";
import "bootstrap";
import io from 'socket.io-client';

$(document).ready(function () {

	var socket = io.connect("/"); 

	socket.on("ticker", (data) => {
		console.log(data);
		
		var new_element = $('<div class="log"></div>').append($('<div class="type"></div>').html(data.pair)).append($('<div class="content"></div>').html(JSON.stringify(data.ticker, null, ' ')));
		$("#ticker-log-container").append(new_element);
	})


	$(".btn-clear").on('click', function() {
		$(this).parents(".component").find(".logs").empty();
	})
});
