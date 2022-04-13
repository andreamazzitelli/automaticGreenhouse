//Adding Needed Modules
var AWS = require('aws-sdk');
var iotdata = new AWS.IotData({ endpoint: 'INSERT HERE YOUR IOTDATA ENDPOINT' });

//Invocation Event Handler
exports.handler = async (event, context, callback) => {
    var result = await publish2Broker(JSON.stringify(event)).then(data =>{
        console.log(data); return data;
    }).catch((err)=>{
        console.error(err);
        return {statusCode: 500}
    });
    
    console.log(result);
    return {
        statusCode:201
    };
};

//Function the publishes on the MQTT Broker at the endpoint
function publish2Broker(str){
    const params = {
        topic: "topic_in",
        payload: str
    };
    
    return iotdata.publish(params).promise();
    
}
