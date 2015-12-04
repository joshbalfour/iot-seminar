// Author: <jdb45@kent.ac.uk>

var fs = require('fs')
, 	path = require('path');

var mqtt    = require('mqtt');

var sp = require("serialport");
var SerialPort = sp.SerialPort;

var serialPort;

var config;

try {
	var configFile = fs.readFileSync('config.json', 'utf-8');
	config = JSON.parse(configFile);
} catch (e) {
	console.error('[Internal]','Failed to read config file', e);
}

var client  = mqtt.connect(config.mqttServer, {
	reconnectPeriod: 100,
	connectTimeout: 200
});

try {
	serialPort = new SerialPort(config.serialPort, {
		baudrate: 38400,
		parser: sp.parsers.readline(config.serialSeparator.in)
	});
} catch (e) {
	console.error('[Serial]','Failed to connect via USB Serial', e);
}

var MQTTConnected = false;
var serialConnected = false;
var reconnectInterval;

function attemptToConnect(){
	reconnectInterval = setInterval(function(){
			if (serialConnected){
				clearInterval(reconnectInterval);
			} else {
				serialPort.open(function(error){
					if (error){
						console.error('[Serial]','[Error]','USB Serial unable to reconnect:', error);
					} else {
						console.log('[Serial]','USB Serial Reconnected');
						initSerial();
						serialConnected = true;
						serialStatusChanged();
					}
				});
			}
		}, config.reconnectInterval * 1000);
}

if (serialPort){

	client.on('connect', function () {
		console.log('[MQTT]','Connected');
		MQTTConnected = true;
		mqttStatusChanged();
		client.on('message', function (topic, message) {
			console.log('[MQTT]','got',topic,message.toString());
			mqttRecieve(topic, message.toString());
		});
		for (var i in config.topicMappings){
			mqttSubscribe(config.topicMappings[i]);
		}
		mqttBroadcastTopics();
	});
	
	client.on('end', function () {
		MQTTConnected = false;
		mqttStatusChanged();
	});
	client.on('close', function () {
		MQTTConnected = false;
		mqttStatusChanged();
	});
	client.on('offline', function () {
		MQTTConnected = false;
		mqttStatusChanged();
	});

	client.on('error', function (err) {
		console.error('[MQTT]','Error occurred', err);
	});

	serialPort.on("open", function () {
		console.log('[Serial]','Connected via USB Serial');
		serialConnected = true;
		serialStatusChanged();
		initSerial();
	});

	

	serialPort.on("error", function (err) {
		console.error('[Serial]','Error:', err);
		attemptToConnect();
	});
	
	

	serialPort.on("close", function () {
		console.error('[Serial]','USB Serial Disconnected');
		serialConnected = false;
		serialStatusChanged();
		attemptToConnect();
	});
}

function initSerial(){
	serialPort.on("data", function (data) {	
		var jsondata, err;
		if (data.toString()[0] != "{"){
			console.log('[Serial]','[Log]', data.toString());
		} else {
			try {
				jsondata = JSON.parse(data.toString());
			} catch (e) {
				err = e;
			}
			if (jsondata){
				
				console.log('[Serial]','[Data]', jsondata);
				
			} else {
				console.log('[Serial]','Got error parsing data', data.toString(), ':', err);
			}
		}
	});
}

function mqttStatusChanged(){
	io.emit('mqtt-connected', MQTTConnected);
}

function serialStatusChanged(){
	io.emit('serial-connected', serialConnected);
}

function publishStatus(){
	mqttStatusChanged();
	serialStatusChanged();
}

function mqttSubscribe(topic){
	if (MQTTConnected){
		console.log('[MQTT]','Subscribed to topic', topic);
		client.subscribe(topic);
	} else {
		console.error('[MQTT]','Unable to subscribe to topic, not connected.')
	}
}

function mqttSend(topic, message){
	if (MQTTConnected){
		console.log('[MQTT]','sending', topic, message);
		client.publish(topic, message);
	} else {
		console.error('[MQTT]','Unable to send message, not connected.');
	}
}

function mqttRecieve(topic, message){
	console.log('[MQTT]','recieved', topic, message);

	var topicMappings = config.topicMappings;
	var serialTopic;
	for (var i in topicMappings){
		if (topicMappings[i] == topic){
			serialTopic = i;
		}
	}
	
	var data;
	try {
		data = JSON.parse(message);
	} catch (e) {
		console.error('[MQTT]','Invalid message', topic, message, ' - ', e);
	}

	if (serialTopic == 'control'){
		serialSend(data);
	} else {
		io.emit('mqtt-recieve', { topic: serialTopic, message: data.data});
	}
}

function serialDataHandler(serialTopic, data){
	var topicMappings = config.topicMappings;
	if (topicMappings[serialTopic]){
		var MQTTTopic = topicMappings[serialTopic];
		console.log('[Mapping]','from serialTopic', serialTopic ,'to MQTT topic', MQTTTopic);
		mqttSend(MQTTTopic, JSON.stringify({data: data}));
	} else {
		console.error('[Mapping]','Mapping not found for serialTopic', serialTopic);
	}
}

function serialSend(message){
	if (serialConnected && serialPort){
		console.log('[Serial]', 'Sending message:', JSON.stringify(message)+config.serialSeparator.out);
		serialPort.write(JSON.stringify(message)+config.serialSeparator.out);
	} else {
		console.log('[Serial]', '[Error]','Error Sending message:', message,' ','Not Connected');
	}
}

/* Web Front-end */

var express = require('express');

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var sassMiddleware = require('node-sass-middleware');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// sass support
app.use(sassMiddleware({
	src: path.join(__dirname, 'styles'),
	dest: path.join(__dirname, 'static', 'styles'),
	debug: false,
	outputStyle: 'compressed',
	prefix: '/styles'
}));

app.use(express.static(path.join(__dirname, 'static')));

var topicMappings = config.topicMappings;

io.on('connection', function (socket) {
	socket.on('mqtt-send', function (topic, message) {
		mqttSend(topicMappings[topic], message);
		publishStatus();
	});

	socket.on('serial-send', function(topic, data){
		var message = {};
		message[topic] = data;
		mqttSend(topicMappings['control'], JSON.stringify(message));
		publishStatus();
	});

	publishStatus();

});

app.get('/', function(req,res){
	res.render("index.jade");
})

server.on('listening', function(){
	var addr = server.address();
	var bind = typeof addr === 'string'
		? 'pipe ' + addr
		: 'port ' + addr.port;
	console.log('[WebServer]','Listening on', bind);
});

server.listen(config.webPort);