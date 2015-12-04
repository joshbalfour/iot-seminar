Josh Balfour - IoT Assignment 4
===

Author: Josh Balfour <jdb45@kent.ac.uk>


# Description

Everything is written in JavaScript - Node.JS on the backend (Host Server) and Angular.JS on the frontend.

The system can be summed up as a tri-directional proxy between three different systems:

* Serial
* MQTT
* WebSocket

If any of the 3 systems disconnect an error object is broadcast and the reconnection loop is instantiated at the interval defined in the configuration.  


## Host Server


The Host Server is the broker between everything - it sends, recieves, parses, filters and reformats the data to ensure everything works as intended.

Three Example scenarios:

### Data from Serial Device

The data is sent to the Host Server by the device connected via serial as a string.

The data should look like this:

```
{ temperature: 24, deviceID: 'ac4b6515-b331-4605-8fc5-08b04fdf5319'}
```

The data is parsed as JSON, and if found to be invalid an error is raised on the console and the data is ignored.

If the data parses correctly the originating device ID is checked against the whitelist of device IDs, if the device ID is not in the whitelist then an error is raised on the console and the data is ignored. 

If the device is in the whitelist then the key of the value that it sent is checked against the list of MQTT topics the Host Server recognises and if a match is found then the data is then passed to the MQTT broker on the mapped topic, e.g. `"temperature" : "unikent/users/jdb45/mysensor/temperature"`.

### Data from MQTT
The data is parsed as JSON, and if found to be invalid an error is raised on the console and the data is ignored.

If the data parses correctly the originating device ID is checked against the whitelist of device IDs, if the device ID is not in the whitelist then an error is raised on the console and the data is ignored.

If the device is in the whitelist then the key of the value that it sent is checked.

If the key is `control` then the data is passed, less the originating device ID, to the serial device.

Otherwise it is checked against the list of serial topics the Host Server recognises and if a match is found the data is then sent, along with the mapped topic, to the WebSocket clients.

### Data from WebSocket

The data is parsed as JSON, and if found to be invalid an error is raised on the console and the data is ignored.

The event name is checked, then if the event name is `mqtt-send` then the recieved topic of the data is checked against the list of MQTT topics the Host Server recognises and if a match is found then the data is then passed to the MQTT broker on the mapped topic, e.g. `"temperature" : "unikent/users/jdb45/mysensor/temperature"`.

If the event name is `serial-send` then the recieved topic of the data is mapped into an object along with the data, and the device ID in the format

```
{topic: data, "deviceID": deviceID}
```
The message is then stringified and passed to the MQTT topic which maps to the `control` topic.

NB: The device ID is not checked during this process as this is done on the receiving end. As we don't have control over the MQTT broker MQTT is treated as untrusted.


## Web Interface

The web interface acts as WebSocket Client and creates a graphical interface which allows the user to control the device, and visualises received data.

On the Client Side it uses [Bootstrap](http://getbootstrap.com) for styling, [AngularJS](http://angularjs.org) for defining behaviour, [Google Charts](https://developers.google.com/chart/) for graphing (with the angular [ng-google-chart](http://angular-google-chart.github.io/angular-google-chart/) plugin), and [Socket.IO Client](http://socket.io/) for real-time communication with the Host Server.

On the Server Side it uses [SASS](http://sass-lang.com/) as the CSS Preprocessor, and [Jade](http://jade-lang.com/) as the HTML Preprocessor.

# Usage

## Pre-requisites

* [Node JS](https://nodejs.org/en/)

## Install Dependancies

```
npm install
```

## Configure

Open the `config.json` file.

This is a JSON file which lets you configure the following aspects of the system:


| Aspect| Config Item in File |  Description | 
|---	|---	|---	|---	
| MQTT Server |   mqttServer | (String) the URL of the MQTT Server to use **including protocol**
|Serial Port (or COM port in Windows)|   serialPort | (String) The location of the device's serial port (or COM port name on Windows)
|Topics | topicMappings | (Object - `{"short" : "/very/long/name"}` ) Dictionary mapping from shortened, serial-friendly, topic names to MQTT absolute topic names to improve speed and reliability
|Topic to publish list of topics to | mqttBroadcastTopicListTopic | (String) The MQTT topic to which to publish the list of topics
| Serial Separator | serialSeparator | (Object - `{"in" : "separator" , "out" : "separator"}`) The separators used to delimit communications with the serial device (if needed)
| Serial reconnection interval | reconnectInterval | The period at which to attempt to reconnect to the serial device if disconnected
| The port to host the web interface on| webPort | (Integer) Default is 3000
| The serial device whitelist | deviceIDWhitelist | (Array - `["deviceID1", "deviceID2"]`) Devices which are allowed to connect to the service

## Run
```
node .
```
Then open a modern browser to http://localhost:3000 (unless you changed the default port and/or are hosting it remotely)

## Debugging

### Logging
Logging is done to the console in the format

```
[Component] [Level] Message
```

If anything is recived via serial that doesn't begin with a `{` it will be passed through as a serial log message and displayed on the console, this can be useful for debugging the serial device's code.

## Many Thanks To

The people that made:

* [Node JS](https://nodejs.org/en/)
* [MQTT](https://www.npmjs.com/package/mqtt)
* [SerialPort](https://www.npmjs.com/package/serialport)
* [Express](http://expressjs.com)
* [Socket.IO](http://socket.io)
* [BootStrap](http://getbootstrap.com)
* [Jade](http://jade-lang.com/)
* [SASS](http://sass-lang.com/)
* [ng-google-chart](http://angular-google-chart.github.io/angular-google-chart/)
* [AngularJS](http://angularjs.org)