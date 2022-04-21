//Importing Standard C Libraries
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

//Importing my functions
#include "functions.h"

//Importing General Purpose Libraries
#include "xtimer.h"
#include "thread.h"

//Importing Libraries for Emcute and Networking
#include "msg.h" //mi sa che non serve
#include "net/emcute.h"
#include "net/ipv6/addr.h"

//Importing Libraries for Servo Motor
#include "periph/pwm.h"
#include "servo.h"

//Importing Libraries for DHT11 Sensor
#include "fmt.h"
#include "dht.h"
#include "dht_params.h"

//Importing Libraries for Relay
#include "periph/gpio.h"

//Importing Libraries for Soil Moisture Sensot
#include "periph/adc.h"


//Definitions for Servo
#define DEV         PWM_DEV(0)
#define CHANNEL     0
#define SERVO_MIN        (900U)
#define SERVO_MAX        (2500U)

//Definitions for Relay
#define RELAY_ON ("ON")
#define RELAY_OFF ("OFF")

#ifndef GOAL_TEMP
#define GOAL_TEMP 200
#endif

//Definitions for Soil Moisture Sensor
#ifndef ANALOG_LINE
#define ANALOG_LINE (ADC_LINE(0))
#endif
#define RES ADC_RES_8BIT //analog read resolution
#define MAX_HUMIDITY (255)

//Definition for Emcute and MQTT Broker
#ifndef EMCUTE_ID
#define EMCUTE_ID           ("nucleo-board")
#endif
#define EMCUTE_PRIO         (THREAD_PRIORITY_MAIN - 1)

#define NUMOFSUBS           (16U)
#define TOPIC_MAXLEN        (64U)

#define SERVER_ADDR ("2000:2::1")
#define SERVER_PORT 1885
#define IPV6_PREFIX_LEN (64U)

#define DEFAULT_INTERFACE ("4")
#define DEVICE_IP_ADDR ("2000:2::2")

#define MQTT_TOPIC_OUT "topic_out"
#define MQTT_TOPIC_IN "topic_in"
#define MQTT_QoS (EMCUTE_QOS_0)

//Definition of Array used as Stack by threads
static char stack[THREAD_STACKSIZE_DEFAULT];
static char temperature_stack[THREAD_STACKSIZE_DEFAULT];
static char soil_stack[THREAD_STACKSIZE_DEFAULT];

//Definition of Emcute Data Structure
static emcute_sub_t subscriptions[NUMOFSUBS];

//Definitions of Servo Motor Data Structure and needed variables
static servo_t servo;
static bool servo_open = false;
static int humidity_upper_bound = (int)(MAX_HUMIDITY*0.2);
static int humidity_lower_bound = (int)(MAX_HUMIDITY*0.6);
static bool servo_always_on = false;
static bool servo_always_off = false; 

//Definitons the Pins for Relay and Soil Moisture Sensor
static gpio_t pin_out = GPIO_PIN(0, 10);
static adc_t pin_in = ANALOG_LINE;

//Definitions of DHT11 Data Structure and needed variables
static dht_t dev;
static int16_t goal_temp = GOAL_TEMP
static bool relay_state = false;
static bool relay_always_on = false;
static bool relay_always_off = false;

//Function called when a message is published on the topic the board is subscribed
static void on_pub(const emcute_topic_t *topic, void *data, size_t len){
    (void)topic;
    (void)len;
    char *in = (char *)data;

    //printf("Received:%s\n", in);
    //printf("### got publication for topic '%s' [%i] ###\n",
    //       topic->name, (int)topic->id);

    if(*in == 'g'){ 
        goal_temp = (int16_t)atoi((in+1));
        printf("%d\n", goal_temp);
    }
    else if(*in == 's'){
       if(*(in+1) == '1'){ //request to keep the servo always open
           servo_always_on = true;
           servo_always_off = false;
           //printf("%d,%d\n", servo_always_on, servo_always_off);
       }
       else if(*(in+1) == '0'){ //request to keep the servo always close
           servo_always_on = false;
           servo_always_off = true;
           //printf("%d,%d\n", servo_always_on, servo_always_off);
       }
       else{ //request to keep the servo always automatic
           servo_always_on = false;
           servo_always_off = false;
           //printf("%d,%d\n", servo_always_on, servo_always_off);
       }
       servo_change_pos();
   }
   else if(*in == 'r'){
       if (*(in+1) == '1'){ //request to keep the relay always open
           relay_always_on = true;
           relay_always_off = false;
       }
       else if(*(in+1) == '0'){ //request to keep the relay always close
           relay_always_on = false;
           relay_always_off = true;

       }
       else{ //request to keep the relay always automatic
           relay_always_on = false;
           relay_always_off = false;
       }
       change_relay_state("");
   }
   return;
}

//Function for the emcute thread
static void *emcute_thread(void *arg)
{
    (void)arg;
    emcute_run(CONFIG_EMCUTE_DEFAULT_PORT, EMCUTE_ID);
    return NULL;    /* should never be reached */
}

//Function that setup the address on the board
static int address_setup(char *name, char *ip_address){

    netif_t *iface = netif_get_by_name(name); //getting the interface where to add the address
    if(iface == NULL){
        puts("No such Interface");
        return 1;
    }

    ipv6_addr_t ip_addr;
    uint16_t flag = GNRC_NETIF_IPV6_ADDRS_FLAGS_STATE_VALID | (IPV6_PREFIX_LEN << 8U); //setting the flag for the set function
    
    //Parsing IPv6 Address from String 
    if(ipv6_addr_from_str(&ip_addr, ip_address) == NULL){
        puts("Error in parsing ipv6 address");
        return 1;
    }

    //Set Interface Options 
    if(netif_set_opt(iface, NETOPT_IPV6_ADDR, flag, &ip_addr, sizeof(ip_addr)) < 0){
            puts("Error in Adding ipv6 address");
            return 1;
        }
    printf("Added %s with prefix %d to interface %s\n", ip_address, IPV6_PREFIX_LEN, name);
    return 0;
}

//Function to connect to the Broker
static int connect_broker(void){
    sock_udp_ep_t gw = { .family = AF_INET6, .port = SERVER_PORT }; //creating the socket
    char *topic = NULL;
    char *message = NULL;
    size_t len = 0;
    
    //Parsing IPv6 Address from String
    if (ipv6_addr_from_str((ipv6_addr_t *)&gw.addr.ipv6, SERVER_ADDR) == NULL) {
        printf("error parsing IPv6 address\n");
        return 1;
    }

    //Connecting to brokee
    if (emcute_con(&gw, true, topic, message, len, 0) != EMCUTE_OK) {
        printf("error: unable to connect to [%s]:%i\n", SERVER_ADDR, (int)gw.port);
        return 1;
    }

    printf("Successfully connected to gateway at [%s]:%i\n",
           SERVER_ADDR, (int)gw.port);

    //Setting Up the subscription
    subscriptions[0].cb = on_pub;
    subscriptions[0].topic.name = MQTT_TOPIC_IN;

    //Subscribing to topic
    if (emcute_sub(&subscriptions[0], MQTT_QoS) != EMCUTE_OK) {
        printf("error: unable to subscribe to %s\n", subscriptions[0].topic.name);
        return 1;
    }

    printf("Now subscribed to %s\n", subscriptions[0].topic.name);

    return 0;
}

//Function to publish on the broker
static int publish(char *t, char *message){
    emcute_topic_t topic;
    topic.name = t;
    //printf("%s lunghezza %d\n", message, strlen(message));
    if(emcute_reg(&topic) != EMCUTE_OK){ //getting ID from the topic
        printf("cannot find topic:%s", topic.name);
        return 1;
    }

    if(emcute_pub(&topic, message, strlen(message), MQTT_QoS) != EMCUTE_OK){ //publishing on the broker
        printf("cannot publish data\n");
        return 1;
    }
    //printf("published message: %s (%i) on topic %s (id:%i)",
    //    message, (int)strlen(message), topic.name, topic.id);
    return 0;

}

//Function to change the servo's positions
static void servo_change_pos(void){
    //printf("In change servo %d, %d\n", servo_always_on, servo_always_off);
    if(servo_always_on){
        if(servo_open)return;
        else{
            servo_set(&servo, 2*SERVO_MIN);
            servo_open = true;
            return;
        }
    }
    else if(servo_always_off){
        if(!servo_open)return;
        else{
            servo_set(&servo, 0);
            servo_open = false;
            return;
        }
    }
    if(servo_open){
        servo_set(&servo, 0);
        servo_open = false;
        return;
    }
    else{
        servo_set(&servo, 2*SERVO_MIN);
        servo_open = true;
        return;
    }

}

//Function that Initialize all Sensors and Actuators
static int sensor_init(void){

    if(servo_init(&servo, DEV, CHANNEL, SERVO_MIN, SERVO_MAX)){
        printf("Failed to Init Servo");
        return 1;
    }
    servo_set(&servo, 0); //resetting servo position at startup
    puts("Servo Initialized");

    if(dht_init(&dev, &dht_params[0])){
        printf("Failed Init DHT");
        return 1;
    }
    puts("DHT11 Initialized");

    if (gpio_init(pin_out, GPIO_OUT)) {
        puts("Failed to Init Relay's Pin");
    }
    puts("Relay's Pin Initialized");
    
    if(adc_init(pin_in)){
        puts("Failed to Init Analog Line");
    }
    puts("Analog Line Init");

    return 0;
}

//Function to change the relay status
static void change_relay_state(char *status){
    if(relay_always_on){
        if(relay_state)return;
        else{
            gpio_set(pin_out);
            relay_state = true;
            return;
        }
    }
    else if(relay_always_off){
        if(!relay_state)return;
        else{
            gpio_clear(pin_out);
            relay_state = false;
            return;
        }
    }

    if(relay_state && strcmp(status, RELAY_OFF)==0){
        //puts("relay off");
        gpio_clear(pin_out);
        relay_state = false;
        return;
    }
    else if(!relay_state && strcmp(status, RELAY_ON)==0){
        //puts("relay on");
        gpio_set(pin_out);
        relay_state = true;
        return;
    }


}

//Function executed on the thread that handles the measurement of temperature and humidity
void *temp_relay_logic(void *arg){

    (void)arg;
    while(1){
        int16_t temp, hum;
        dht_read(&dev, &temp, &hum); //reading values from sensor
        //printf("DHT values - temp: %d.%d°C - relative humidity: %d.%d%%\n",temp, temp%10, hum/10, hum%10);
        if(temp > goal_temp*1.1)change_relay_state(RELAY_OFF);
        else if(temp <= goal_temp*0.9)change_relay_state(RELAY_ON);

        //setting up message to send
        char message[9];    
        sprintf(message,"t%dh%d", temp, hum);
        publish(MQTT_TOPIC_OUT, message); //publishing message on broker

        xtimer_sleep(15); //sleeping

    }
    return NULL;
}

//Function executed on the thread that handles the measurement of soil moisture
void *soil_water_logic(void *arg){
    (void)arg;
    int soil_hum;
    
    while (1)
    {
        soil_hum = adc_sample(pin_in, RES); //reading values from sensor

        if(soil_hum < 0)printf("Error in Sampling");
        else if(soil_hum > humidity_upper_bound && servo_open){
            servo_change_pos();
        }
        else if(soil_hum < humidity_lower_bound && !servo_open){
            servo_change_pos();
        }

        //setting up message to send
        char message[5];
        sprintf(message, "s%d", soil_hum);

        publish(MQTT_TOPIC_OUT, message); //publish message on broker

        xtimer_sleep(15); //sleeping time
    }
    return NULL;    
}

//Main
int main(void){

    puts("Starting Up\n");

    //Setting memory for the subscription list
    memset(subscriptions, 0, (NUMOFSUBS * sizeof(emcute_sub_t)));

    //Starting Emcute Thread
    thread_create(stack, sizeof(stack), EMCUTE_PRIO, 0,
                  emcute_thread, NULL, "emcute");
    printf("Emcute Thread Started\n");
    
    // Adding GUA to the interface 
    if(address_setup(DEFAULT_INTERFACE, DEVICE_IP_ADDR)){
        printf("Impossible to set up the interface\n");
        return 1;
    }
    
    //Connecting to broker and subscribing to topics*/
    if(connect_broker()){
        printf("Impossible to Connect Correctly with the Broker\n");
        return 1;
    }

    //Initializing Sensors
    if(sensor_init()){
        printf("Failed to Initialize Sensors\n");
        return 1;
    }
    
    //Starting Thread that handles temperature and humidity measurement
    thread_create(temperature_stack, 
                sizeof(temperature_stack),
                THREAD_PRIORITY_MAIN - 1, 0,
                temp_relay_logic, NULL, "temp_relay_logic");
    puts("Temperature Thread Started");

    //Starting Thread that handles soil moisture measurement
    thread_create(soil_stack,
                sizeof(soil_stack),
                THREAD_PRIORITY_MAIN -1, 0,
                soil_water_logic, NULL, "soil_water_logic");
    puts("Soil Thread Started");

    /*Never to be reached*/
    return 0;
}
