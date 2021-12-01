from __future__ import print_function

import os, random, json, time, sys, math, array

from flask import Flask, render_template, request, session, redirect, url_for
from flask_session import Session
from flask_socketio import SocketIO, emit


app = Flask(__name__)
app.config['SESSION_TYPE'] = 'filesystem'
app.secret_key = os.urandom(32)
Session(app)
socketio = SocketIO(app, manage_session=False)

mapSize = 1000 # map size in x and y dir

class Player:

	def __init__(self, nickname):
		self.nickname = nickname
		self.x = random.randint(0,mapSize)
		self.y = random.randint(0,mapSize)
		# 0 = Dead | 1 = Alive | -1 = Offline
		self.status = 0
		self.angle = 0
		self.lastMove = time.time()
		self.kills = 0
		self.lastShot = time.time()
		self.id = len(players[0])
		self.accuracy = 360
		self.lastRequest = time.time()
		self.materials = 10
		# 0 - 100 (%) 360 = 100%
		
	def die(self):
		if(record == None or self.kills > record[1]):
			record[0] = self.nickname
			record[1] = self.kills
		self.status = 0
		self.kills = 0
		templb = []
		for p in players[0]:
			templb.append({'nickname': p.nickname, 'kills': p.kills})
			
		for p in range(0, len(templb)):
			for pp in range(0, len(templb)):
				if(templb[p]['kills'] > templb[pp]['kills']):
					tempp = templb[p]
					templb[p] = templb[pp]
					templb[pp] = tempp			
		
		
		for i in range(0,min(5, len(templb))):
			if(len(leaderboards[0]) > i):
				leaderboards[0][i] = templb[i]
			else: 
				leaderboards[0].append(templb[i])
		

	def spawn(self, nickname):
		self.nickname = nickname
		self.x = random.randint(0, mapSize)
		self.y = random.randint(0, mapSize)
		self.status = 1
		self.lastMove = time.time()
		self.kills = 0
		self.accuracy = 180
		self.materials = 10
	
	def shoot(self):
		if(time.time()-self.lastShot >= 0.2): # Shot delay
			self.lastShot = time.time()
			rand = 0
			bullets[0].append(Bullet(self, rand, 0))
			if(self.accuracy > 0):
				self.accuracy -= 180
			else:
				self.accuracy = 0
			
			
		
class Bullet:
	def __init__(self, p, rand, partners):
		self.x = p.x
		self.y = p.y
		self.status = 1
		self.angle = (p.angle-90 + rand)*0.01745
		self.shot = time.time() # When the bullet was shot
		self.lifespan = 1.2
		self.shooter = p.id
		self.id = len(bullets[0])
		self.partners = partners
		
		self.x1 = p.x
		self.y1 = p.y
		self.x2 = math.cos(self.angle)*(p.accuracy+120)
		self.y2 = math.sin(self.angle)*(p.accuracy+120)
		
	def die(self):
		if(self.partners!=0):
			for i in range(0, self.partners+1):
				bs[self.id+i].status = 0
		self.status = 0

	def move(self):
		timealive = time.time() - self.shot
		if(timealive < self.lifespan): 
			self.x	= self.x1 + self.x2 * ((timealive) / self.lifespan)
			self.y	= self.y1 + self.y2 * ((timealive) / self.lifespan)

			for p in ps:
				if(p.status == 1):
					if(abs(p.y-self.y) < 10 and abs(p.y-self.y) < 10):
						if(p.id != self.shooter and p.status == 1 and math.sqrt(((p.y)-(self.y))*((p.y)-(self.y)) + ((p.x)-(self.x))*((p.x)-(self.x)))<10): # If distance < 10
							self.die()
							p.die()
							players[0][self.shooter].kills += 1
							players[0][self.shooter].materials += max(p.materials, 1)
							if(players[0][self.shooter].materials>50):
								players[0][self.shooter].materials = 50
			for bx in bxs:
				if(bx.health >= 1 and bx.status != 0):
					if(bx.x-self.x < 20 and bx.x-self.x > 0 and bx.y-self.y < 20 and bx.y-self.y > 0):
						self.die()
						bx.health-=5
				elif(bx.status != 0):
					emit('remove box', {'id': bx.id}, broadcast=True)
					bx.status = 0
					
			
 			
		else:
			self.die()

class Box:
	def __init__(self, x, y, p = None):
		self.x = x
		self.y = y
		self.health = 5
		self.id = len(boxes[0])
		self.status = 1
		self.shooter = -1
		if(p):
			self.shooter = p.id
		else:
			self.health = 10000000
	
		
def error(msg):
	emit('error', {'message': msg}, broadcast=False)
	
# Players within a lobby
players = [[]]
bullets = [[]]
boxes = [[]]
leaderboards = [[]]
record = ['Anton',16]

ps = players[0]
bs = bullets[0]
bxs = boxes[0]

NUMBOTS = 0

for i in range(0,NUMBOTS):
	ps.append(Player("bot"))
	ps[i-1].spawn("bot" + str(i))

@app.route('/')
@app.route('/home')
@app.route('/index')
def indexHTML():
	if(session.get('player') is not None):
		return render_template('index.html', player=session['player'])
	else:
		return render_template('index.html', player=None)
		
		
@app.route('/loading')
def loadingHTML():
	return render_template('loading.html')

@app.route('/play')
def playHTML(user):
	return

@socketio.on('join')  
def join(data):
	nickname = data['nickname']
	if(len(nickname)>20):
		return error('Invalid nickname')
	
	if 'lobby' not in session:
		session['lobby'] = 0;
		
	ps = players[session.get('lobby')] # PS short for players in lobby	
		
	#if 'player' not in session or session.get('player') >= len(ps):
	session['player'] = len(players[session.get('lobby')])
	ps.append(Player(nickname))
		
	print('\n\n- New User -', file=sys.stderr)
	print('ID: ' + str(session.get('player')), file=sys.stderr)
	print('Lobby: ' + str(session.get('lobby')), file=sys.stderr)
	print('Nickname: "' + ps[session.get('player')].nickname + '"', file=sys.stderr)
	print('(' + str(ps[session.get('player')].x) + ', ' + str(ps[session.get('player')].y) + ')', file=sys.stderr)
	
	ps[session['player']].spawn(nickname)
	
	emit('online', {'player': ps[session.get('player')].__dict__, 'id': session.get('player'), 'lobby': session.get('lobby')}, broadcast=False)
	for bx in bxs:
		if(bx.health >= 1 and bx.status == 1):
			emit('place box', {'x': bx.x, 'y': bx.y, 'id': bx.id}, broadcast=False)
	
@socketio.on('request info')
def sendInfo():
	ps_dict = [] # Dict of Players
	bs_dict = [] # Dict of Bullets
	materials = players[0][session.get('player')].materials
		
	psid = ps[session.get('player')] # Current player
	for p in ps:
		if(math.sqrt(((p.y)-(psid.y))*((p.y)-(psid.y)) + ((p.x)-(psid.x))*((p.x)-(psid.x)))<400 and p.status == 1): # If distance < 400 
			ps_dict.append(p.__dict__)
		else:
			ps_dict.append(None)
				
	for b in bs:
		if(b.status == 1):
			b.move()
			if(math.sqrt(((b.y)-(psid.y))*((b.y)-(psid.y)) + ((b.x)-(psid.x))*((b.x)-(psid.x)))<400): # If distance < 400
				bs_dict.append(b.__dict__)
		else:
			bs_dict.append(None)
		

	if(psid.accuracy < 360):
		psid.accuracy += (time.time()-psid.lastRequest)*180 # 2 Seconds to fully recover
	else:
		psid.accuracy = 360
	
	emit('info', {'record': record, 'players': ps_dict, 'bullets': bs_dict, 'accuracy': psid.accuracy, 'materials': materials, 'leaderboards': leaderboards[0]}, broadcast=False)
	
	psid.lastRequest = time.time()
	
@socketio.on('move')
def move(data):
	x = data['x']
	y = data['y']
	p = players[session.get('lobby')][session.get('player')]
	timeDiff = (time.time()-p.lastMove)
	if(timeDiff*500 > (abs(p.y-y)+(abs(p.x-x))) and x < mapSize+10 and x > -10 and y < mapSize+10 and y > -10):
		if(p.accuracy > 0):
			p.accuracy -= (abs(p.y-y)+(abs(p.x-x)))*2
		else:
			p.accuracy = 0
			
		for bx in bxs:
				if(bx.health >= 1 and bx.status != 0):
					if(bx.x-x < 20 and bx.x-x > 0 and bx.y-y < 20 and bx.y-y > 0):
						return
				elif(bx.status != 0):
					emit('remove box', {'id': bx.id}, broadcast=True)
					bx.status = 0
				
		p.x = x
		p.y = y
		p.lastMove = time.time()
		
@socketio.on('shoot')
def shootBullet():
	players[session.get('lobby')][session.get('player')].shoot()

@socketio.on('rotate')
def rotate(data):
	p = players[session.get('lobby')][session.get('player')]

	angle = data['angle']
	
	if(p.accuracy > 0):
		p.accuracy -= abs(angle-p.angle)/5
	else:
		p.accuracy = 0
		
	p.angle = angle
	
@socketio.on('place box')
def placeBox(data):
	p = players[session.get('lobby')][session.get('player')]
	if(p.materials < 1):
		return
	x = (data['x']) + p.x + 20
	y = (data['y']) + p.y + 20
	x -= x%20
	y -= y%20
	if(x>mapSize or x<=0 or y>mapSize or y<=0):
		return
	for bx in bxs:
		if(bx.x == x and bx.y == y and bx.health>=1):
			return
	bxs.append(Box(x, y, p))
	emit('place box', {'x': x, 'y': y, 'id': len(bxs)-1}, broadcast=True)
	p.materials -= 1

if __name__ == '__main__':
	app.run(host = '0.0.0.0')