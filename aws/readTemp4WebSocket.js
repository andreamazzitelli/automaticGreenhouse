//Import Needed Modules
const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler =  (event, context, callback) => {
  
  console.log(event);
  
  const apigwManagementApi = new AWS.ApiGatewayManagementApi({
    apiVersion: '2018-11-29',
    endpoint: "gpfgs9p80f.execute-api.us-east-1.amazonaws.com/production/"
  });
  
  let message = JSON.stringify(event)
  console.log(JSON.stringify(event))
    getConnections().then((data) => {
        data.Items.forEach(function(connection) {
          send2WS(apigwManagementApi,connection.connectionId, message);
        });
    });
    
    return {}
};

//Function to extract active connection from database
function getConnections(){
    return ddb.scan({
        TableName: 'connection_table',
    }).promise();
}

//Function to send the data to all active connections
async function send2WS(apiMan, connectionId, data){
  var params = {
    ConnectionId: connectionId,
    Data: data
  }
  return apiMan.postToConnection(params).promise()
}
