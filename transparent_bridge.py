from ast import parse
from operator import le
import paho.mqtt.client as mqtt
from AWSIoTPythonSDK.MQTTLib import AWSIoTMQTTClient
import json

#AWS Paramater Init
AWS_HOST = "PUT HERE YOUR AMAZON ENDPOINT" #can be found as parameter '-e' in the last line of the file start.sh
AWS_ROOT_CAP_PATH = "PUT HERE THE ABSOLUTE PATH TO root-CA.crt "
AWS_CERTIFICATE_PATH = "PUT HERE THE ABSOLUTE PATH TO nucleo-board.cert.pem"
AWS_PRIVATE_KEY_PATH = "PUT HERE THE ABSOLUTE PATH TO nucleo-board.private.key"
AWS_PORT = 8883
AWS_CLIENT_ID = "nucleo"


#MQTT Broker Parameters
MQTT_SERVER = "localhost"
MQTT_PORT = 1886
MQTT_KEEP_ALIVE = 60


TOPIC_FROM_BOARD = "topic_out"
TOPIC_TO_BOARD = "topic_in"

TOPIC_FROM_AWS = "topic_in"
TOPIC_TEMP_TO_AWS = "topic_out_temp"
TOPIC_SOIL_TO_AWS = "topic_out_soil"

def mqtt_publish(mqtt_client, topic, message):
    mqtt_client.publish(topic, message)

#Handles msg from AWS to send to MQTT Broker
def customAWSCallback(client, userdata, message):

    message_out = json.loads(message.payload)
    if "new_temp" in message_out: ##handling for a feature not yet implemented
        message_out = str(round(float(message_out["new_temp"])*10))
        message_out = "g" + message_out
    else:
        message_out = message_out["command"]

    mqtt_publish(MQTT_CLIENT,TOPIC_TO_BOARD, message_out)

# Function called to send messages to AWS, invoked when a msg is received from the MQTT Broker
def aws_publish(aws_client, message):
    message_out = {}
    #handling messages to send to different AWS topic
    if(message[0] == "t"): #msg received is from temperature and humidity sensor
        message = message.split("h")
        message_out['temperature'] =  message[0][1:len(message[0])-1]+"."+ message[0][len(message[0])-1:]
        message_out['humidity'] = message[1][:len(message[1])-1]+"."+ message[1][len(message[1])-1:]
        messageJson = json.dumps(message_out)
        aws_client.publish(TOPIC_TEMP_TO_AWS, messageJson, 1)
    elif(message[0] == "s"): #msg received is from the soil moisture sensor
        message_out['soil_humidity'] = str(round(float(message[1:])*(100/255), 2))
        messageJson = json.dumps(message_out)
        aws_client.publish(TOPIC_SOIL_TO_AWS, messageJson, 1)
    
    

#MQTT Broker Interfaction

# The callback for when the client receives a CONNACK response from the server.
def on_connect(client, userdata, flags, rc):
    print("Connected with result code "+str(rc))

    #subscription to topic in MQTT broker 
    client.subscribe(TOPIC_FROM_BOARD) 

# The callback for when a PUBLISH message is received from the server.
def on_message(client, userdata, msg):
    print(msg.topic+" "+str(msg.payload))

    message = str(msg.payload)[2:len(str(msg.payload))-1]

    #calling function to publish on AWS
    aws_publish(AWS_CLIENT, message)

print("Transparent Bridge Starting\n")
#AWS and MQTT Objects
AWS_CLIENT = None
MQTT_CLIENT = None

#AWS Start Init

AWS_CLIENT = AWSIoTMQTTClient(AWS_CLIENT_ID)
AWS_CLIENT.configureEndpoint(AWS_HOST, AWS_PORT)
AWS_CLIENT.configureCredentials(AWS_ROOT_CAP_PATH, AWS_PRIVATE_KEY_PATH, AWS_CERTIFICATE_PATH)

AWS_CLIENT.connect() #connection to aws
AWS_CLIENT.subscribe(TOPIC_FROM_AWS, 1, customAWSCallback) #subscripe to aws topic

#AWS Finish Init

#MQTT Start Init 
MQTT_CLIENT = mqtt.Client()
MQTT_CLIENT.on_connect = on_connect
MQTT_CLIENT.on_message = on_message
MQTT_CLIENT.connect(MQTT_SERVER, MQTT_PORT, MQTT_KEEP_ALIVE) #connection to broker (subscription is done in the on_connect function)
#add on connection fail?
MQTT_CLIENT.loop_forever()
#MQTT Finish Init
