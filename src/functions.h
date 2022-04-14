static void *emcute_thread(void *arg);
static int address_setup(char *name, char *ip_address);
static int connect_broker(void);
static int publish(char *t, char *message);
static void servo_change_pos(void);
static int sensor_init(void);
static void change_relay_state(char *status);
void *temp_relay_logic(void *arg);
void *soil_water_logic(void *arg);
