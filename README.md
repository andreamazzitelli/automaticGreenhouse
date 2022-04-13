# automaticGreenhouse
This is the repository for the Internet of Thing 2021/2022 of the Master in Computer Science, La Sapienza Università di Roma

The scope of the project is to create an automatic greenhouse that can act on the environment in which a plant is living to tailor the living space to the plant’s needs. By monitoring the environment, it’s possible to learn in real time the conditions in which the plant is living. In particular, the system measures those aspects that are fundamental to a plant, these being temperature, humidity and soil moisture. Knowing this information the system can promptly act in several ways: opening or closing the water, turning on and off a heating lamp or by keeping the light always on. 

So to take the measurements needed by the system the following two sensors were selected:
- DHT11 Humidity and Temperature: this sensor collects information on the temperature and on the air’s humidity and gives them to the system using an analog output. In particular, for the temperature it has a range of 0-50°C with an accuracy of +/- 2°C with a precision of 8 bits; and for the humidity we have a range of 20-90% RH (RH stands for Relative Humidity) with an accuracy of +/- 5% RH with a resolution of 8 bits. (the datasheet can be found here [DHT11 Datasheet](https://www.mouser.com/datasheet/2/758/DHT11-Technical-Data-Sheet-Translated-Version-1143054.pdf)
