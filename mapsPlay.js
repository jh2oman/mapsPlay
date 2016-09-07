

Scores = new Mongo.Collection("scores");

Router.route('/', function(){
	this.render('game');
});
Router.route('/game', function(){
	this.render('game');
});
Router.route('/highscores', function(){
	this.render('highscores');
});

if (Meteor.isClient) {

/*
 * Game()
 * constructor function for game Singleton
 * INPUTS - none
 * OUTPUTS - none
 * SIDE EFFECTS- constructs a game object
 */
function Game(){
	//Global data used throughout the game
	this.globals = {
		map:'',
		panorama:'',
		sv:'',
		marker:'',
		realMarker:'',
		line:'',
		currTurn:0,
		currScore: ''
	}
	//Turn based information
	this.turn = [];
	var data = {
		guessedLocation: '',
		realLocation: '',
		distance: '',
		points:''
	};
	for(i =0;i<5;i++){
		var newData = JSON.parse( JSON.stringify( data ) );
		this.turn[i] = newData;
	}
}

/*
 * var game = new Game();
 * initializes the global game function
 * INPUTS - none
 * OUTPUTS - none
 * SIDE EFFECTS-
 		The game object is used as the sole global object in this code. Everything that we need to
 		keep track of from score, to the map object, or the current turn is stored in this object
 		The reasoning behind this is to demonstrate the use of Singleton Design Pattern which I found
 		suited this application's structure.
 */
var game = new Game();

/*
 * Game.prototype.set(key, value)
 * set function for global game object
 * INPUTS - key, value
 * OUTPUTS - value
 * SIDE EFFECTS- updates the game object accordingly
 */
Game.prototype.set = function(key,value){

 	if(key === "distance" || key==="points" || key==="currScore" || key==="currTurn")
 		if(typeof value === 'number')
 			value = Math.floor(value);

 		if(this.turn[this.globals.currTurn][key] !== undefined){
 			this.turn[this.globals.currTurn][key] = value;
 		}
 		else if(this.globals[key] !== undefined){
 			this.globals[key] = value;
 		}
 		else
 			console.log("incorrect set", key, value);

 		if(key === "distance" || key==="points" || key==="currScore" || key==="currTurn")
 			Session.set(key,value);
 		return value;
}

/*
 * Game.prototype.get(key)
 * set function for global game object
 * INPUTS - key
 * OUTPUTS - value
 * SIDE EFFECTS- retrieves variables from the game object accordingly
 */
Game.prototype.get = function(key){
 	if(this.turn[this.globals.currTurn][key] !== undefined)
 		return this.turn[this.globals.currTurn][key];
 	else if(this.globals[key] !== undefined)
 		return this.globals[key];
 	else
 		console.log("incorrect get", key, value);
}

/*
 * initMap()
 * callback function once page recieves Google Maps API
 * INPUTS - none
 * OUTPUTS - none
 * SIDE EFFECTS- initializes game variables, sets up pano and map, sets up event listeners.
 */
initMap = function() {
 	game.set("currScore",0);
 	$('#helperText').css({"display" : "initial"});
 	game.set("sv",  new google.maps.StreetViewService());
	// Set up the map.
	game.set("panorama", new google.maps.StreetViewPanorama(document.getElementById('pano'),
		{
			fullScreenControl:false,
			addressControl:false,
			PanControlOptions : {
				position: google.maps.ControlPosition.LEFT_BOTTOM
			}
		}) );

	// Set up the map.
	var map = game.set("map", new google.maps.Map(document.getElementById('map'), {
		zoom: 1,
		streetViewControl: false,
		disableDefaultUI: true,
		draggableCursor: "crosshair"
	}) );
	randomGenerate();

	//hover map event listeners
	$('#mapWrapper').mouseenter(function(){
		$('#mapWrapper').addClass('mapWrapperHover');
		$('#mapBox').addClass('mapBoxHover');
	});
	$('#pano').click(function(){
		$('#mapWrapper').removeClass('mapWrapperHover');
		$('#mapBox').removeClass('mapBoxHover');
		$('#mapBox').removeClass('mapBoxHover');
	});

	//add button event listeners
	document.getElementById("guessLocation").addEventListener("click", guessLocation);
	document.getElementById("nextTurn").addEventListener("click", nextTurn);
	document.getElementById("finishGame").addEventListener("click", finishGame);
	document.getElementById("newGame").addEventListener("click", newGame);
	document.getElementById("addHighScore").addEventListener("click", addHighScore);


	$('#guessLocationMobile').click(showMapMobile);

	//add event listener for guessLocation

	map.addListener('click', function(event) {
		if(game.get("points") === '')
		{
			if(game.get("marker") !== '')
				game.get("marker").setMap(null);
			game.set("guessedLocation", event.latLng);
			game.set("marker",  new google.maps.Marker({
				position: event.latLng,
				icon: 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
				animation: google.maps.Animation.DROP,
				map: map
			}));

			$('#guessLocation').prop("disabled", false);
		}
	});
}


/*
 * showMapMobile()
 * callback function when the "Show Map" button is clicked on mobile
 * INPUTS - none
 * OUTPUTS - none
 * SIDE EFFECTS- shows the map, changes callback function, and changes the button's text
 */
function showMapMobile(){
	$(this).off("click");
	$('#mapBox').addClass("mapBoxMobile").removeClass("mapBoxHidden");
	$('#mapWrapper').addClass("mapWrapperMobile").css({"transform": "translate(0px,-450px)",
		"-webkit-transition": "transform .5s ease-in-out"});
	$('#map').addClass("mapMobile");
	var arrow = "<span class='glyphicon glyphicon-arrow-down' aria-hidden='true'></span>"
	$( this ).html(arrow);
	$(this).click(hideMapMobile);
}

/*
 * hideMapMobile()
 * callback function when the "hide map" button is clicked on mobile
 * INPUTS - none
 * OUTPUTS - none
 * SIDE EFFECTS- hides the map, changes callback function, and changes the button's text
 */
function hideMapMobile(){
	$("#guessLocationMobile").off("click");
	setTimeout(function(){
		$('#mapBox').addClass("mapBoxHidden").removeClass("mapBoxMobile");
	},200)
	$('#mapWrapper').css({"transform": "translate(0px,450px)",
		"-webkit-transition": "transform .5s ease-in-out"});
  	//$('#map').removeClass("mapMobile");
  	$("#guessLocationMobile").html("Show Map");
 	$("#guessLocationMobile").click(showMapMobile);
}

/*
 * randomGenerate()
 * function used throughout the game to randomly select a location
 * INPUTS - none
 * OUTPUTS - none
 * SIDE EFFECTS- finds a random location, updates game object accordingly
 */
function randomGenerate(){
	//Random number 0-6
	var region = Math.floor(Math.random()*7);
	var quadrilateral
	var randLat, randLng;
	switch(region){
		//North America
		case 0:
		quadrilateral={a:{x:-97.21,y:7.88}, b:{x:-129.9,y:41.77}, c:{x:-149.24,y:65.73}, d:{x:-57.48,y:49.95} };
		break;
		//South America
		case 1:
		quadrilateral={b:{x:-32.34,y:-5.79}, a:{x:-73.83,y:13.01}, d:{x:-81.73,y:-2.28}, c:{x:-71.19,y:-55.97} };
		break;
		//Europe
		case 2:
		quadrilateral={a:{x:-10.89,y:35.46}, b:{x:-11.25,y:54.98}, c:{x:28.65,y:71.86}, d:{x:30.06,y:37.86} };
		break;
		//Africa
		case 3:
		quadrilateral={a:{x:24.08,y:-39.63}, b:{x:7.73,y:-19.64}, c:{x:31.46,y:37.99}, d:{x:63.81,y:22.59} };
		break;
		//Asia
		case 4:
		quadrilateral={a:{x:57.83,y:64.32}, b:{x:119.88,y:56.17}, c:{x:160.31,y:40.31}, d:{x:114.25,y:9.62} };
		break;
		//South Pacific
		case 5:
		quadrilateral={a:{x:197.75,y:-52.05}, b:{x:116.72,y:-39.63}, c:{x:78.22,y:34.59}, d:{x:143.26,y:-9.79} };
		break;
		//Total Random
		case 6:
		quadrilateral={a:{x:-167.87,y:-60.05}, b:{x:-169.72,y:74.63}, c:{x:176.66,y:75.85}, d:{x:176.66,y:-55.56} };
		break;
	}

	var location = quadToLocation(quadrilateral);
	game.get("sv").getPanorama({location: location, radius: 1000000, source: google.maps.StreetViewSource.OUTDOOR}, placePano);
}

/*
 * quadToLocation(quad)
 * Helper function for randomGenerate()
 * INPUTS - quadrilateral object
 * OUTPUTS - location object
 * SIDE EFFECTS- Finds a random point on a quadrilateral
 */
function quadToLocation(quad){
	var t1, t2, total;
	var r1 = Math.random();
	var r2 = Math.random();

	//Calculate relative area of two tringles within quadrilateral
	t1 = Math.abs(quad.a.x*(quad.b.y-quad.d.y) + quad.b.x*(quad.d.y-quad.a.y) + quad.d.x*(quad.a.y-quad.b.y));
	t2 = Math.abs(quad.d.x*(quad.b.y-quad.c.y) + quad.b.x*(quad.c.y-quad.d.y) + quad.c.x*(quad.d.y-quad.b.y));
	total = t1+t1;

	//Decide ramdom triangle and alculate random points within said triangle
	if(Math.random()*total < t1){
		randLng = (1- Math.sqrt(r1)) * quad.a.x + (Math.sqrt(r1)*(1-r2)) * quad.b.x + (Math.sqrt(r1)*r2) * quad.d.x;
		randLat = (1- Math.sqrt(r1)) * quad.a.y + (Math.sqrt(r1)*(1-r2)) * quad.b.y + (Math.sqrt(r1)*r2) * quad.d.y;
	}
	else{
		randLng = (1- Math.sqrt(r1)) * quad.d.x + (Math.sqrt(r1)*(1-r2)) * quad.b.x + (Math.sqrt(r1)*r2) * quad.c.x;
		randLat = (1- Math.sqrt(r1)) * quad.d.y + (Math.sqrt(r1)*(1-r2)) * quad.b.y + (Math.sqrt(r1)*r2) * quad.c.y;
	}
	var location = new google.maps.LatLng(randLat,randLng);
	return location;
}

/*
 * placePano(data,status)
 * callback function for getPanorama
 * INPUTS - data=pano info; status= status of getPano
 * OUTPUTS - none
 * SIDE EFFECTS- Sets panorama, or calls itself again with an expanded radius
 */
function placePano(data,status, quadrilateral){
	if (status === google.maps.StreetViewStatus.OK) {
		//set Pano
		game.get("panorama").setPano(data.location.pano);
		game.get("panorama").setPov({
			heading: 270,
			pitch: 0,
			zoom:1
		});
		game.get("panorama").setVisible(true);
	    //set real location
	    game.set("realLocation", data.location.latLng);
		game.get("map").setCenter({lat:25, lng:0});
		game.get("map").setZoom(1);
	}

	else {
	    //console.log('Street View data not found for this location.');
	    // quadToLocation(quadrilateral);
	    // var location = new google.maps.LatLng(randLat,randLng);
	    // game.get("sv").getPanorama({location: data.location.latLng, radius: 1000000, source: google.maps.StreetViewSource.OUTDOOR}, placePano);
	    randomGenerate();
	}
}

/*
 * getPoints(distance)
 * calculates points as a function of distance between guessed location and real location
 * INPUTS - distance
 * OUTPUTS - points
 * SIDE EFFECTS-
 */
function getPoints(distance){
	var a = 1000;
	var b = 3;
	var c =2000;

	return a*Math.pow(b,-distance/c);
}


/*
 * getdistance(latlng1, latlng2)
 * calculates distance between two latitude longitude points
 * INPUTS - latlng1, latlng2 = Google LatLng objects
 * OUTPUTS - distance
 * SIDE EFFECTS-
 */
function getDistance(latlng1, latlng2) {
	var lat1 = latlng1.lat();
	var lng1 = latlng1.lng();
	var lat2 = latlng2.lat();
	var lng2 = latlng2.lng();
	var R = 6371; // Radius of the earth in km
	var dLat = deg2rad(lat2-lat1);  // deg2rad below
	var dLon = deg2rad(lng2-lng1);
	var a =
	Math.sin(dLat/2) * Math.sin(dLat/2) +
	Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
	Math.sin(dLon/2) * Math.sin(dLon/2)
	;
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
	var d = R * c; // Distance in km
	d*=0.621371;
	return d;

	//helper function
	function deg2rad(deg) {
		return deg * (Math.PI/180)
	}
}


/* -----------------------------EVENT LISTENER CALLBACKS ----------------------------- */


/*
 * guessLocation()
 * called when the user guesses a location on the map
 * INPUTS - none
 * OUTPUTS - none
 * SIDE EFFECTS- calculates and updates distance/score, updates map, and updates game buttons
 */
function guessLocation(){

	//Calculates Distance/Score
	var latlngBound = new google.maps.LatLngBounds();
	latlngBound.extend(game.get("realLocation"));
	latlngBound.extend(game.get("guessedLocation"));
	var distance = getDistance(game.get("realLocation"), game.get("guessedLocation"))
	game.set("distance" , distance);
	game.set("points", getPoints(distance));
	var currScore = game.set("currScore", game.get("points") + game.get("currScore") );
	Session.set("currScore", currScore);

	//Updates Map
	var lineCoordinates = [game.get("realLocation"),game.get("guessedLocation")];
	game.set("line",  new google.maps.Polyline({
		path: lineCoordinates,
	    //geodesic: true,
	    strokeColor: '#FF0000',
	    strokeOpacity: 1.0,
	    strokeWeight: 2
	}) );

	game.set("realMarker", new google.maps.Marker({
		position: game.get("realLocation"),
		icon:'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
		map: game.get("map") }));

	game.get("line").setMap(game.get("map"));
	game.get("map").fitBounds(latlngBound);

	//Updates Game Buttons
	$('#guessLocation').css({"display" : "none"}).prop("disabled", true);;

	if(game.get("currTurn") < 4)
		$('#nextTurn').css({"display" : "initial"});
	else
		$('#finishGame').css({"display" :"initial"});

}

/*
 * nextTurn()
 * goes to the next turn
 * INPUTS - none
 * OUTPUTS - none
 * SIDE EFFECTS- incraments currTurn and other properties, updates buttons, calls randomGenerate()
 */
function nextTurn(){
	Session.set("currTurn",game.set("currTurn", game.get("currTurn") +1));
	game.set("distance",'');
	game.set("points",'');
	game.get("marker").setMap(null);
	game.get("line").setMap(null);
	game.get("realMarker").setMap(null);
	if($('#mapWrapper').hasClass("mapWrapperMobile"))
		hideMapMobile();
	$('#guessLocation').css({"display" : "inline-block"})
	$('#nextTurn').css({"display" : "none"});
	randomGenerate();

}

/*
 * finishGame()
 * finishes the game
 * INPUTS - none
 * OUTPUTS - none
 * SIDE EFFECTS- updates buttons and opens highscore modal
 */
function finishGame(){
	$('#scoreModal').css({"display" : "initial"});
	$('#scoreModal').modal();
	$('#finishGame').css({"display" : "none"});
	$('#newGame').css({"display" : "initial"});
}

/*
 * newGame()
 * called when the user starts a new Game
 * INPUTS - none
 * OUTPUTS - none
 * SIDE EFFECTS- creates new global game object and calls initMap()
 */
function newGame(){
	game = new Game();
	Session.set('currScore','0 ');
	Session.set('currTurn',0);
	Session.set('points','');
	Session.set('distance','');
	$('#newGame').css({"display" : "none"});
	$('#guessLocation').css({"display" : "inline-block"})

	if($('#mapWrapper').hasClass("mapWrapperMobile"))
		hideMapMobile();

	initMap();
}

/*
 * addHighScore(event)
 * called when the user enters in their score
 * INPUTS - event
 * OUTPUTS - none
 * SIDE EFFECTS- updates the database and takes the user to the highscores page
 */
function addHighScore(event){
	event.preventDefault();
	var username = $('#username').val();
	var score = game.get("currScore");
	if(username.length < 3){
		alert("Username must be at least 3 characters long");
		return;
	}
	if(username.length >11){
		alert("Username cannot be more than 11 characters long");
		return;
	}
	Scores.insert({
		username:username,
		playedAt: new Date(),
		score: score
	});
	$('#scoreModal').modal('hide');
	$('.modal-backdrop').remove();

	newGame();
	Router.go('highscores');
}

/*
 * Template.highscores.onRendered()
 * called when the highscores template renders
 * INPUTS - none
 * OUTPUTS - none
 * SIDE EFFECTS- manipulates dom elements
 */
Template.highscores.onRendered(function(){
	Meteor.setTimeout(function(){
		var topScore = $('.scoreBar')[0].innerHTML;
		$('.scoreBar').each(function(){
			if(window.innerWidth >400)
				var score = $(this).html() /topScore * 300;
			else
				var score = $(this).html() /topScore * 200;
			if(score <30)
				score = 30;
			$(this).css({width: score +"px"});
		})
	}, 2000)


	$('#playGame').click(function(){Router.go('/');});
});


/*
 * Template.game.helpers()
 * helper functions for pushing variables to the game template
 * INPUTS - none
 * OUTPUTS - none
 * SIDE EFFECTS- none
 */
Template.game.helpers({
	distance: function(){
		var distance = Session.setDefault('distance','');
		distance = Session.get("distance");
		return distance;
	},
	points: function(){
		var points = Session.setDefault('points','');
		points = Session.get("points");
		return points;
	},
	currScore: function(){
		var currScore = Session.setDefault('currScore','0 ');
		currScore = Session.get("currScore");
		return currScore;
	},
	currTurn: function(){
		var currTurn = Session.setDefault('currTurn','');
		currTurn = Session.get("currTurn") +1;
		return currTurn;
	}
});

/*
 * Template.highscores.helpers()
 * helper functions for pushing variables to the highscores template
 * INPUTS - none
 * OUTPUTS - none
 * SIDE EFFECTS- none
 */
Template.highscores.helpers({
	scores: function(){
		return Scores.find({score : {$gt: 0}},{sort: {score: -1}}, {limit:10});
	},
	getWidth: function(score, index){
		if(index ===0)
			Session.set("topScore", score);
		return width = score/Session.get("topScore")*200;
	},
	getColor: function(index){
		var colorArray = ["#1abc9c","#D24D57","#674172","#4183D7","#F7CA18","#6C7A89","#D35400","#03C9A9","#DB0A5B","#22A7F0"];
		return colorArray[index % 10];
	}
});

//end Meteor.isClient
}

if (Meteor.isServer) {

}
