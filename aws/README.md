# AWS
in thi directory you can find all the code for the lambda function. In some of the there must be added some information relative the the aws account (i.e region of the resource).

Moreover make sure to grant the following permissions (to easy the process simply grant the function all the permissions to the service):
- connect: write on table connection_table of DynamoDB
- disconnet: write on table connection_table of DynamoDB
- publish2Broker: publish messages on IoT Core
- readSoilHumidity: read table soil_humidity_table of DynamoDB
- readTemp4WebSocket: read table connection_table of DynamoDB, access to API Gateway and Execute API (NOTE: even if the name of this function suggests that is only for the temperature and humidity messages, indeed is also for soil_humidity ones)
- readTemperature: read table temperature_table of DynamoDB
