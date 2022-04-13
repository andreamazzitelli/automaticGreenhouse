# automaticGreenhouse
This is the repository for the Internet of Thing 2021/2022 of the Master in Computer Science, La Sapienza Università di Roma

### General Description
The scope of the project is to create an automatic greenhouse that can act on the environment in which a plant is living to tailor the living space to the plant’s needs. By monitoring the environment, it’s possible to learn in real time the conditions in which the plant is living. In particular, the system measures those aspects that are fundamental to a plant, these being temperature, humidity and soil moisture. Knowing this information the system can promptly act in several ways: opening or closing the water, turning on and off a heating lamp or by keeping the light always on. 

## Sensors
So to take the measurements needed by the system the following two sensors were selected:
- DHT11 Humidity and Temperature: <img src="images/dht11.jpg" alt="dht11" width="200" align="right"/><br> this sensor collects information on the temperature and on the air’s humidity and gives them to the system using an analog output. In particular, for the temperature it has a range of 0-50°C with an accuracy of +/- 2°C with a precision of 8 bits; and for the humidity we have a range of 20-90% RH (RH stands for Relative Humidity) with an accuracy of +/- 5% RH with a resolution of 8 bits. (the datasheet can be found here [DHT11 Datasheet](https://www.mouser.com/datasheet/2/758/DHT11-Technical-Data-Sheet-Translated-Version-1143054.pdf))

- Soil Humidity Sensor: <img src="images/soil_sensor.jpg" alt="soil_sensot" width="200" align="right"/><br> this sensor collects information on the soil moisture using capacitive sensing (i.e its capacitance changes depending on how much moisture is present in the soil), it gives its output to the system as analog input. (the datasheet can found here [Soil Humidity Sensor Datasheet](https://cdn.shopify.com/s/files/1/1509/1638/files/Hygrometer_V1.2_Sensor_Modul_Datenblatt_AZ-Delivery_Vertriebs_GmbH.pdf?v=1608545956))

The sensing done by the sensor is periodic because the system needs to continuously evaluate the environment in which the plant is living, indeed an event-driven one would not make sense taking into account the analogical nature of what the system measures (i.e temperature …). In particular the interval at which the sensors take their measurements is 15 seconds so that the system can always be updated without being overloaded with values.
Important that these sensors work independently even if the aspect they measure may depend on each other. For example air humidity may depend on the moisture in the soil but it also decreases with high temperature, for this reason the sensors must work in parallel to provide a correct and continuous evaluation of the environment.

## Actuators
Instead to act on the environment the following two actuators were selected:
- Servo Motor SG90: <img src="images/servo.jpg" alt="servo_motor" width="200" align="right"/><br> the servo motor open and closes the water, for this reason it’s activation/deactivation depends on the values detected by the soil moisture sensor so to keep the humidity of the soil between 20% and 60% (that is the adequate percentage for most types of plants – da controllare meglio questa cosa). More precisely the servo opens the water when the soil moisture gets lower than 20% and turn off the water when the moisture gets higher than 60% (the datasheet can be found here [Servo Motor Datasheet](http://www.ee.ic.ac.uk/pcheung/teaching/DE1_EE/stores/sg90_datasheet.pdf))

- Relay Module 5V/250VAC: <img src="images/relay.jpg" alt="relay" width="200" align="right"/><br>the relay instead can be used in several ways depending on what the user goal is but in general is used to keep the temperature above a certain threshold by turning on and off a heating bulb. More precisely it is turned on if the temperature sensed by the dht11 sensor gets lower that (goal_temperature -10%) and is turned off if the value gets higher that (goal_temperature +10%) 	(NOTE: the +/- 10% are needed to avoid the relay to keep switching on and off due to very small changes in temperature) (the datasheet can be found here: [Relay Datasheet](https://components101.com/switches/5v-single-channel-relay-module-pinout-features-applications-working-datasheet))

The activation or deactivation of these actuators can be done manually by the user, but by default is done in an automatic way. 

# Data Processed on the by the Board
In general the amount of the data received from the sensors depends on how well the threads that handle the measurement are synchronized. If they are perfectly in sync, then the system would receive a total of 24 bits (8 bits for temperature, 8 bits for relative humidity and 8 bits for soil moisture). 
This data is then formatted in a message that is then sent to the broker. In particular to reduce the number of bytes sent by the device in the network the message has a payload size of 9 bytes when sending data about temperature and humidity, and size of 5 bytes when sending data about soil moisture. Obviously in addition to the payload the message has a header but in this case is small thanks to the use of mqtt-sn protocol.

### System Architecture
In the following section the architecture of the whole system will be described starting from an overall view of the network components, then analyzing all the cloud aspects, and in conclusion there will be a brief description of how the sensors and actuators are connected to the board.
<br>
<img src="images/generalArchitecture.png" alt="generalArchitecture" align="center"/>
<br>
The general architecture of the network can be described as a chain of blocks that exchange messages; this structure is shown in the image above. More in detail the block that compose the system are:
