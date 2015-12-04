// Author: <jdb45@kent.ac.uk>

(function(){
	angular.module('iot', ['googlechart']);
})();

(function(){
	angular.module('iot').factory('mqtt', function ($rootScope) {
		
		var deviceID = "baecc6ad-17e8-4dc9-a6e5-5a1605ae3d65";

		var client = function(){
			var ws  = io.connect();

			this.on = function(event, callback){
				ws.on('mqtt-'+event, callback);
			}

			this.subscribe = function(topic){
				ws.emit('mqtt-subscribe', topic);
			}

			this.send = function(topic, message){
				ws.emit('mqtt-send', topic, message);
			}

			this.serial = {};

			this.serial.on = function(event, callback){
				ws.on('serial-'+event, callback);
			}

			this.serial.send = function(topic, data){
				ws.emit('serial-send', topic, data, deviceID);
			}

		}

		return new client();
	});
})();

(function(){
	angular.module('iot').controller('iot-app', function($scope, mqtt){
		$scope.mode = 1;
		
		$scope.$watch('mode', function(newVal){
			mqtt.serial.send('mode', newVal);
		});

		mqtt.serial.send('mode', $scope.mode);

	});
})();

(function(){
	angular.module('iot').controller('monsterShooter', function($scope, mqtt, $timeout){
		mqtt.subscribe('monsterPos');
		mqtt.subscribe('fired');
		mqtt.subscribe('timeLeft');
		mqtt.subscribe('points');

		$scope.data = {};

		mqtt.on('recieve', function(data){
			
			var topic = data.topic;
			var message = data.message;
			

			$scope.data[topic] = message;
			
			if (topic == "fired"){
				$timeout(function(){
					$scope.data.fired = 0;
				}, 300);
			}

			if (topic == "timeLeft"){
				$scope.data.timeLeft = parseInt($scope.data.timeLeft);
				$scope.gauge.data = [
					['Label', 'Value'],
					['', $scope.data.timeLeft]
				];
			}

			$scope.$apply();
		});
		
		$scope.status = {};

		mqtt.on('connected', function(connected){
			$scope.status.mqtt = connected;
			$scope.$apply();
		});

		mqtt.serial.on('connected', function(connected){
			$scope.status.serial = connected;
			$scope.$apply();
		});

		$scope.play = function(){
			mqtt.serial.send('entered', false);
		}

		$scope.gauge = {};

		$scope.gauge.type = "Gauge";

		$scope.gauge.options = {
			width: 400,
			height: 120,
			redFrom: 0,
			redTo: 5,
			yellowFrom: 5,
			yellowTo: 15,
			minorTicks: 5,
			min: 0,
			max: 30
		};


		$scope.gauge.data = [
			['Label', 'Value'],
			['', 0]
		];

	});
})();

(function(){
	
	angular.module('iot').controller('temperatureGraph', function($scope, mqtt){

		$scope.status = {};

		mqtt.on('connected', function(connected){
			$scope.status.mqtt = connected;
			$scope.$apply();
		});

		mqtt.serial.on('connected', function(connected){
			$scope.status.serial = connected;
			$scope.$apply();
		});

		$scope.gauge = {};

		$scope.gauge.type = "Gauge";

		$scope.gauge.options = {
			width: 400,
			height: 120,
			redFrom: 25,
			redTo: 35,
			yellowFrom: 20,
			yellowTo: 25,
			minorTicks: 5,
			min: 0,
			max: 35
		};


		$scope.gauge.data = [
			['Label', 'Value'],
			['', 0]
		];

		$scope.temperatures = [];


		function getTemperatureRows(){
			return $scope.temperatures.map(function(temperature){
				return {"c": 
					[ 	
						{ "v" : temperature.time },
						{ "v" : temperature.temp }
					]
				}
			});
		}
		

		$scope.graph = {
		  "type": "LineChart",
		  "displayed": true,
		  "data": {
			"cols": [
			  {
				"id": "month",
				"label": "Month",
				"type": "datetime",
				"p": {}
			  },
			  {
				"id": "temp",
				"label": "Temperature (Celcius)",
				"type": "number",
				"p": {}
			  }
			],
			"rows": []
		  },
		  "options": {
			"isStacked": "true",
			"fill": 20,
			"displayExactValues": true,
			"vAxis": {
			  "title": "Temperature",
			  "gridlines": {
				"count": 5
			  }
			},
			"hAxis": {
			  "title": "Date"
			}
		  },
		  "formatters": {
			"color": [
			  {
				"columnNum": 4,
				"formats": [
				  {
					"from": 0,
					"to": 3,
					"color": "white",
					"bgcolor": "red"
				  },
				  {
					"from": 3,
					"to": 5,
					"color": "white",
					"fromBgColor": "red",
					"toBgColor": "blue"
				  },
				  {
					"from": 6,
					"to": null,
					"color": "black",
					"bgcolor": "#33ff33"
				  }
				]
			  }
			]
		  },
		  "view": {
			"columns": [
			  0,
			  1,
			]
		  }
		};

		mqtt.on('recieve', function(data){
			
			var topic = data.topic;
			var message = data.message;

			console.log('[MQTT]', topic, message);

			if (topic == 'temperature'){
				$scope.temperatures.push({temp: parseFloat(message), time: new Date()});
				reloadGraphs();
			}

		});

		function reloadGraphs(){
			$scope.gauge.data = [
				['Label', 'Value'],
				['', $scope.temperatures[$scope.temperatures.length - 1].temp]
			];

			$scope.graph.data.rows = getTemperatureRows();
			$scope.$apply();
		}

		$scope.min = function(){
			var min = 9999;
			for (var i in $scope.temperatures){
				if ($scope.temperatures[i].temp < min){
					min = $scope.temperatures[i].temp;
				}
			}
			return min;
		}

		$scope.max = function(){
			var max = -9999;
			for (var i in $scope.temperatures){
				if ($scope.temperatures[i].temp > max){
					max = $scope.temperatures[i].temp;
				}
			}
			return max;
		}

		mqtt.subscribe('temperature');

	});

})();

(function(){
	angular.module('iot').controller('compass', function($scope, mqtt, $timeout){
		mqtt.subscribe('mag');

		$scope.data = {};

		mqtt.on('recieve', function(data){
			
			var topic = data.topic;
			var message = data.message;
			

			$scope.data[topic] = message;

			$scope.$apply();
		});
		
		$scope.status = {};

		mqtt.on('connected', function(connected){
			$scope.status.mqtt = connected;
			$scope.$apply();
		});

		mqtt.serial.on('connected', function(connected){
			$scope.status.serial = connected;
			$scope.$apply();
		});

		$scope.play = function(){
			mqtt.serial.send('entered', false);
		}

		$scope.gauge = {};

		$scope.gauge.type = "Gauge";

		$scope.gauge.options = {
			width: 400,
			height: 120,
			redFrom: 0,
			redTo: 5,
			yellowFrom: 5,
			yellowTo: 15,
			minorTicks: 5,
			min: 0,
			max: 30
		};


		$scope.gauge.data = [
			['Label', 'Value'],
			['', 0]
		];

	});
})();