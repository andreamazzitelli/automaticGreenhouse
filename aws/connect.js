//Imposrt needed Modules
const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB.DocumentClient({region: "us-east-1"});

exports.handler = (event, context, callback) => {
    const connectionId = event.requestContext.connectionId;
    addConnectionId(connectionId).then(() => {
    callback(null, {
        statusCode: 200,
        })
    });
}

//Function to add a connection to the DB
function addConnectionId(connectionId) {
    return ddb.put({
        TableName: 'connection_table',
        Item: {
            "connectionId" : connectionId
        },
    }).promise();
}
