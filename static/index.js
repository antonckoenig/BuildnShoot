var r = 310;
var g = 310;
var b = 0;
var backgroundtimer = 0;
var up = false;
var down = false;
var left = false;
var right = false;
var x = 0;
var y = 0;
var speed = 2;
var socket;
var vw; // View Width / 100
var vh; // View Height / 100
var timer = 0; // Time and coordinate web socket move signals
var id;
var home;
var map;
var load;
var size = 1000; // map size
var alive = false;
var accuracy;
var materials;
var kills;
var boxes = [];
var build;
var players;
var bullets;
var leaderboards;
var wt;
var wb;
var wr;
var wl;


// On content load: 
document.addEventListener('DOMContentLoaded', () => {
	vh = window.innerHeight/100;
	vw = window.innerWidth/100;
	home = document.querySelector('#home');
	map = document.querySelector('#map');
	load = document.querySelector('#load');
	wt = document.querySelector('.wall-top');
	wb = document.querySelector('.wall-bottom');
	wr = document.querySelector('.wall-right');
	wl = document.querySelector('.wall-left');
    storage = window.localStorage;
    socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);
    changeColor(0);
    map.style.display = 'none';
	
	// On connect with server:
    socket.on('connect', () => {
    	// TODO: Join a game step 1 (joining a server):
    	
    	// Join a game step 2 (pressing and submitting button):
    	document.querySelector('#play').onclick = () => {
    		var nickname = document.querySelector('#nickname').value;
    		socket.emit('join', {'nickname': nickname});
    		return false;
    	}
    	
	});
	
	
	function info() {
    	// Request information on the game
		socket.emit('request info');
	}

	
    socket.on('online', data => {
    	var nickname = data.player.nickname;
    	id = data.id;
    	var lobby = data.lobby;
    	x = data.player.x;
    	y = data.player.y;
    	storage.setItem('id', id);
    	storage.setItem('lobby', lobby);
    	info();
    	document.onmousemove = handleMouseMove;
    	document.onmousedown = placeBox;
    	home.style.opacity = 1;
    	map.style.opacity = 1;
    	alive = true;
    	map.style.display = 'block';
    	console.log(alive);
    });
    
    
    
    socket.on('info', data => {
    	vh = window.innerHeight/100;
		vw = window.innerWidth/100;
		v = Math.max(vh, vw);
    	players = data.players;
    	bullets = data.bullets;
    	var id = storage.getItem('id');
    	leaderboards = data.leaderboards;
    	accuracy = data.accuracy;
    	materials = data.materials;
    	record = data.record;
    	var p = players[id];
    	
    	if(p == null || !p.status || p.status == 0) {
    		restart();
    	}
    	
    	var kills = p.kills
    	var nickname = p.nickname
    	var newMap = document.createDocumentFragment();
    	
    	if(materials == 50) {
    		materials = '<span style="font-weight: bolder;">50</span>'
    	}
    	
		stats.innerHTML = 	'<div id="accuracy-container">'
						+	'<div id="accuracy" style="width: calc(' + accuracy/3.6 + '% - 8px);">Shot Power</div></div>'
						+ 	'<br/><span style="font-weight: bolder">Kills:</span> ' + kills
						+ 	'<br/><span style="font-weight: bolder">Materials:</span> ' + materials
						+ 	'<br/><br/><span style="font-weight: bolder">Top Kills:</span>';
	
		for(var i = 0; i<leaderboards.length; i++) {
			if(leaderboards[i].nickname == nickname && (leaderboards[i].kills == kills || leaderboards[i].kills == kills-1)) {
				if(nickname.length == 0) {
					nickname = '<Unnamed>';
				}
				stats.innerHTML += '<br/><span style="font-weight: bolder">' + nickname + ': ' + kills + '</span>';
			}
			else {
				if(leaderboards[i].nickname.length == 0) {
					leaderboards[i].nickname = '<Unnamed>';
				}
				stats.innerHTML += '<br/>' + leaderboards[i].nickname + ': ' + leaderboards[i].kills;
			}
		}
    	stats.innerHTML += 	'<br/><br/><span style="font-weight: bolder">World Record Kills: </span><br/>' + record[0] + ': ' + record[1];
    	// loop through and draw all the nearby players in the lobby
    	for(var i = 0; i<players.length; i++) {
    		if(players[i] != null) {
				var elm;
				if(document.getElementById(i)) {
					elm = document.getElementById(i);
				} else {
					elm = document.createElement('div');
				}
				if(document.getElementById(i) == null) {
					elm.innerHTML = '<div class="player-inner" id="' + i + '-inner"></div><div class="player-nickname">' + players[i].nickname + "</div>";
					elm.style.display = 'block';
					elm.className = 'player';
					if(i==id) {
						elm.className = 'player prime';
					}
					elm.id = i;
					elm.style.top = parseInt((players[i].y-players[id].y)*v/5 + (window.innerHeight/2)-2*v);
					elm.style.left = parseInt((players[i].x-players[id].x)*v/5 + (window.innerWidth/2)-2*v);
					newMap.appendChild(elm);
				}
				else {
					var elmInner = document.getElementById(i + '-inner');
					elm.style.top = parseInt((players[i].y-players[id].y)*v/5 + (window.innerHeight/2)-2*v);
					elm.style.left = parseInt((players[i].x-players[id].x)*v/5 + (window.innerWidth/2)-2*v);
					elmInner.style.transform = 'rotate(' + players[i].angle + 'deg)';
				}
				
			} else { // Null represents players that are outside the user's view distance
				if(document.getElementById(i)) {
					document.querySelector('#map').removeChild(document.getElementById(i));
				}
			}
			
		}
		
		// loop through and draw all the nearby players' bullets in the lobby
		
		for(var i = 0; i<bullets.length; i++) { 
    		if(bullets[i] != null) {
				var elm;
				if(document.getElementById('b' + i)) {
					elm = document.getElementById('b' + i);
				} else {
					elm = document.createElement('div');
				}
				if(document.getElementById('b' + i) == null) {
					elm.className = 'bullet';
					elm.style.display = 'block';
					if(bullets[i].shooter==id) {
						elm.className = 'bullet prime-bullet';
					}
					elm.id = 'b' + i;
					elm.style.top = parseInt((bullets[i].y-players[id].y)*v/5 + (window.innerHeight/2)-0.4*v);
					elm.style.left = parseInt((bullets[i].x-players[id].x)*v/5 + (window.innerWidth/2)-0.4*v);
					newMap.appendChild(elm);
				}
				else {
					elm.style.top = parseInt((bullets[i].y-players[id].y)*v/5 + (window.innerHeight/2)-0.4*v);
					elm.style.left = parseInt((bullets[i].x-players[id].x)*v/5 + (window.innerWidth/2)-0.4*v);
				}
			} else { // Null represents bullets that are no longer 'alive'
				if(document.getElementById('b' + i)) {
					document.querySelector('#map').removeChild(document.getElementById('b' + i));
				}
			}
			
		}
		for(var i = 0; i<boxes.length; i++) { 
    		if(boxes[i] != null && boxes[i].x != -1000) {
				var elm;
				if(document.getElementById('box' + i)) {
					elm = document.getElementById('box' + i);
				} else {
					elm = document.createElement('div');
				}
				if(document.getElementById('box' + i) == null) {
					elm.className = 'box';
					elm.style.display = 'block';
					elm.id = 'box' + i;
					elm.style.top = parseInt((boxes[i].y-y)*v/5 + (window.innerHeight/2)-4*v);
					elm.style.left = parseInt((boxes[i].x-x)*v/5 + (window.innerWidth/2)-4*v);
					newMap.appendChild(elm);
				}
				else if(boxes[i].y-y < 400 && boxes[i].x-x < 400) {
					elm.style.top = parseInt((boxes[i].y-y)*v/5 + (window.innerHeight/2)-4*v);
					elm.style.left = parseInt((boxes[i].x-x)*v/5 + (window.innerWidth/2)-4*v);
				}
			} else { // Null represents bullets that are no longer 'alive'
				if(document.getElementById('box' + i) != null) {
					document.querySelector('#map').removeChild(document.getElementById('box' + i));
				}
			}
			
		}
		document.querySelector('#map').appendChild(newMap);
		info()
	});
	
	
	socket.on('place box', data => {
		if(alive) {
			for(i = boxes[boxes.length-1]; boxes[data.id] == null; i++) {
				boxes.push({'x': -1000, 'y': -1000});
			}
			boxes[data.id] = {'x': data.x, 'y': data.y};
		}

	});
	socket.on('remove box', data => {
		if(alive) {
			if(document.getElementById('box' + data.id) != null) {
				document.querySelector('#map').removeChild(document.getElementById('box' + data.id));
			}
			boxes[data.id] = null;
		}

	});
	
});

	
function handleMouseMove(event) {
	
	// Send information to the game
	var id = storage.getItem('id');
	if(document.getElementById(id) != null) {
		var elm = document.getElementById(id);
		var elmInner = document.getElementById(id + '-inner');
		var elmCenter=[parseInt(elm.style.left)+25, parseInt(elm.style.top)+25];

		var angle = parseInt(Math.atan2(event.pageX - elmCenter[0], - (event.pageY - elmCenter[1]) )*(180/Math.PI));      

		elmInner.style.transform = 'rotate(' + angle + 'deg)'; 
		socket.emit('rotate', {'angle': angle});
		if(build) {
			vh = window.innerHeight/100;
			vw = window.innerWidth/100;
			v = Math.max(vh, vw);
			var curx = parseInt((event.pageX-window.innerWidth/2)/v*5);
			var cury = parseInt((event.pageY-window.innerHeight/2)/v*5);
			x2 = (curx) + x + 20;
			y2 = (cury) + y + 20;
			x2 -= x2%20;
			y2 -= y2%20;
			socket.emit('place box', {'x': curx, 'y': cury});
		}
	}
}

function press(e)	{
	if (e.keyCode === 38 /* up */ || e.keyCode === 87 /* w */ && y > 0){
		up = true;
		down = false;
	}
	if (e.keyCode === 39 /* right */ || e.keyCode === 68 /* d */ && x < size){
		right = true;
		left = false;
	}
	if (e.keyCode === 40 /* down */ || e.keyCode === 83 /* s */ && y < size){
		down = true;
		up = false;
	}
	if (e.keyCode === 37 /* left */ || e.keyCode === 65 /* a */ && x > 0){
		left = true;
		right = false;
	}
	if (e.keyCode === 32 /* space */) {
		socket.emit('shoot');
	}
	if (e.keyCode === 16 /* shift */) {
		build = true;
	}
}
document.addEventListener('keydown',press);


function release(e)	{
	if (e.keyCode === 38 /* up */ || e.keyCode === 87 /* w */){
		up = false;
		timer = 0;
	}
	if (e.keyCode === 39 /* right */ || e.keyCode === 68 /* d */){
		right = false;
		timer = 0;
	}
	if (e.keyCode === 40 /* down */ || e.keyCode === 83 /* s */){
		down = false;
		timer = 0;
	}
	if (e.keyCode === 37 /* left */ || e.keyCode === 65 /* a */){
		left = false;
		timer = 0;
	}
	if (e.keyCode === 16 /* shift */) {
		build = false;
	}
}
document.addEventListener('keyup',release);

function walls() {
	v = Math.max(vh, vw);
	wt.style.height = Math.max(parseInt((0-y)*v/5 + (window.innerHeight/2))-1, 0);
	wb.style.height = Math.max(parseInt((y-1000)*v/5 + (window.innerHeight/2))-1, 0);
	wr.style.width = Math.max(parseInt((x-1000)*v/5 + (window.innerWidth/2))-1, 0);
	wl.style.width = Math.max(parseInt((0-x)*v/5 + (window.innerWidth/2))-1, 0);
}

function gameLoop()	{
	if(home.style.opacity>0 && alive) {
		home.style.opacity -= 0.05;
		map.style.opacity += 0.05;
	} else if(home.style.opacity==0) {
		home.style.display = 'none';
	}
	timer += 1;
	
	for(var i = 0; i<boxes.length; i++) { 
		if(boxes[i] != null) {
			var bx = boxes[i];
			if(bx.x-x < 25 && bx.x-x > -5 && bx.y-y < 25 && bx.y-y > -5) {
				if(bx.x-x < 20 && bx.y-y <= 20 && bx.y-y >= 0) {
					left = false;
				}
				if(bx.x-x > 0  && bx.y-y <= 20 && bx.y-y >= 0){
					right = false;
				}
				if(bx.y-y < 0 && bx.x-x <= 20 && bx.x-x >= 0) {
					up = false;
				}
				if(bx.y-y > 20 && bx.x-x <= 20 && bx.x-x >= 0) {
					down = false;
				}
			}
		}
	}
	
	walls();
	
	if (up && y > 0){
		y -= speed;
		socket.emit('move', {'x': x, 'y': y});
	}
	if (right && x < size){
		x += speed;
		socket.emit('move', {'x': x, 'y': y});
	}
	if (down && y < size){
		y += speed;
		socket.emit('move', {'x': x, 'y': y});
	}
	if (left && x > 0){
		x -= speed;
		socket.emit('move', {'x': x, 'y': y});
	}
	window.requestAnimationFrame(gameLoop);
}
window.requestAnimationFrame(gameLoop);

function placeBox(event) {
	if(materials < 1) {
		return;
	}
	vh = window.innerHeight/100;
	vw = window.innerWidth/100;
	v = Math.max(vh, vw);
	var curx = parseInt((event.pageX-window.innerWidth/2)/v*5);
	var cury = parseInt((event.pageY-window.innerHeight/2)/v*5);
	x2 = (curx) + x + 20;
	y2 = (cury) + y + 20;
	x2 -= x2%20;
	y2 -= y2%20;
	socket.emit('place box', {'x': curx, 'y': cury});
}


function changeColor () {
  
	backgroundtimer++;
	
	r = Math.abs(155-backgroundtimer%310) + 75;
	g = Math.abs(155-(backgroundtimer+104)%310) + 75;
	b = Math.abs(155-(backgroundtimer+208)%310) + 75;

	setTimeout(function() {
		changeColor();
	}, 50);
	
	document.getElementById('container').style.background = 'rgb('+r+','+g+','+b+')';
}

function restart () {
	document.querySelector('#map').innerHTML = "";
	alive = false;
	home.style.display = 'block';
	map.style.display = 'none';
	home.style.opacity = 1;
	map.style.opacity = 0;
	boxes = [];
}
