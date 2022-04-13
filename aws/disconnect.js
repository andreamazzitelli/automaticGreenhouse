//Importing needed Modules
const AWS = require('aws-sdk');
const ddb = new AWS.DynamoDB.DocumentClient();

exports.handler = (event, context, callback) => {
    const connectionId = event.requestContext.connectionId;
    addConnectionId(connectionId).then(() => {
    callback(null, {
        statusCode: 200,
        })
    });
}

//Function to add element to connection table
function addConnectionId(connectionId) {
    return ddb.delete({
        TableName: 'connection_table',
        Key: {
            connectionId : connectionId,
        },
    }).promise();
}
