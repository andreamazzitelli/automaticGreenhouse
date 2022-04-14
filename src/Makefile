APPLICATION = automaticGreenhouse


BOARD ?= nucleo-f401re
RIOTBASE ?= $(CURDIR)/../RIOT

#importing all modules and features needed

USEMODULE += servo
USEMODULE += dht
USEMODULE += periph_gpio

#modules for network connection and emcute
USEMODULE += netdev_default
USEMODULE += auto_init_gnrc_netif
USEMODULE += gnrc_ipv6_default
USEMODULE += sock_udp
USEMODULE += emcute
USEMODULE += gnrc_netif_single
CFLAGS += -DCONFIG_GNRC_NETIF_IPV6_ADDRS_NUMOF=3
USEMODULE += stdio_ethos gnrc_uhcpc

FEATURES_REQUIRED = periph_gpio
FEATURES_REQUIRED = periph_adc


IPV6_PREFIX ?= 2000:2::/64 #setting ipv6 prefix

#ethos setup
STATIC_ROUTES ?= 1
UPLINK ?= ethos
ETHOS_BAUDRATE ?= 115200
CFLAGS += -DETHOS_BAUDRATE=$(ETHOS_BAUDRATE)

TAP ?= tap0
host-tools:
	$(Q)env -u CC -u CFLAGS $(MAKE) -C $(RIOTTOOLS)

TERMDEPS += host-tools
TERMPROG ?= sudo sh $(RIOTTOOLS)/ethos/start_network.sh
TERMFLAGS ?= $(FLAGS_EXTRAS) $(PORT) $(TAP) $(IPV6_PREFIX) $(ETHOS_BAUDRATE)

ifneq (,$(EMCUTE_ID))
  CFLAGS += -DEMCUTE_ID=\"$(EMCUTE_ID)\"
endif
#end ethos setup

CFLAGS += "-DDHT_PARAM_PIN=GPIO_PIN(0,1)" #dht11 pin setup

#addition elements
DEVELHELP ?= 1
QUIET ?= 1

include $(RIOTBASE)/Makefile.include
include $(RIOTMAKE)/default-radio-settings.inc.mk

