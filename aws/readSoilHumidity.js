//Exportinf Needed Module
const AWS = require("aws-sdk");
const ddb = new AWS.DynamoDB.DocumentClient({region: "INSERT HERE YOUR REGION"});

exports.handler = async (event, context, callback) => {
        var scan_result = await readMessage().then(data => {
            return data.Items
 }).catch((err) => {
     console.error(err);
 });
    
    return {
            statusCode: 201,
             body: scan_result
        };
 
};

//Function to read data from the soil_humidity_table
function readMessage(){
    var tempo = parseInt(Date.now()-3600000); //extracting tuple with timestamp higher than 1 hour ago
    //console.log(tempo);
    const params = {
        TableName: "soil_humidity_table",
        FilterExpression: "id >= :lb",
        ExpressionAttributeValues:{
            ":lb": tempo
        }
    };
    return ddb.scan(params).promise();
    
}
