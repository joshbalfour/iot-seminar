// Author: <jdb45@kent.ac.uk>

(function(){
	angular.module('iot', ['']);
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
