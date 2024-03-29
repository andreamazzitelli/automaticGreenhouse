//Getting Last Status of Actuators from LocalStorage
changeRelayButtonStatus(getLocalStorage("relay_last_status"))
changeServoButtonStatus(getLocalStorage("servo_last_status"))

//Start Chart Setup
const labels_temp = [];
const labels_hum = [];
const labels_soil = [];
const data_temp = {
  labels: labels_temp,
  datasets: [{
    label: 'Temperature',
    backgroundColor: 'rgb(255,69,0)',
    borderColor: 'rgb(255,69,0)',
    pointBackgroundColor: 'rgb(255,69,0)',
    fill: false,
    tension: 0.4,
    data: [],
  }]
};
const data_hum = {
  labels: labels_hum,
  datasets: [{
    label: 'Humidity',
    backgroundColor: 'rgb(0,0,255)',
    borderColor: 'rgb(0,0,255)',
    pointBackgroundColor: 'rgb(0,0,255)',
    fill: false,
    tension: 0.4,
    data: [],
  }]
};

const data_soil = {
  labels: labels_soil,
  datasets: [{
    label: 'Soil Moisture',
    backgroundColor: 'rgb(50,205,50)',
    borderColor: 'rgb(50,205,50)',
    pointBackgroundColor: 'rgb(50,205,50)',
    fill: false,
    tension: 0.4,
    data: [],
  }]
};

const config_temp = {
  type: 'line',
  data: data_temp,
  options: {}
};

const config_hum = {
  type: 'line',
  data: data_hum,
  options: {}
};
const config_soil = {
  type: 'line',
  data: data_soil,
  options: {}
};

const chartTemp = new Chart(
  document.getElementById('chartTemp'),
  config_temp
);

const chartHum = new Chart(
  document.getElementById('chartHum'),
  config_hum
);

const chartSoil = new Chart(
  document.getElementById('chartSoil'),
  config_soil
)
//End Chart Setup

//Calling REST API and populating Charts
callTempHum().then(() => { updateAggregateValuesTemp(chartTemp, chartHum) })
callSoil().then(() => { updateAggregateValuesSoil(chartSoil) })

//WebSocket Handling
let socket = new WebSocket("wss://gpfgs9p80f.execute-api.us-east-1.amazonaws.com/production");
socket.onopen = function () { console.log("Connect to WebSocket") }
socket.onmessage = function (event) {
  //console.log("Message Received")
  var time = new Date()
  time = parseInt(time.getUTCHours()) + ":" + parseInt(time.getUTCMinutes()) + ":" + parseInt(time.getUTCSeconds())
  //console.log(event.data)
  //console.log(typeof (event.data))
  var data = event.data
  //console.log(data)
  //console.log(data["soil_humidity"])

  if (data.includes("temperature")) {
    data = JSON.parse(event.data)
    var new_temp = data["temperature"]
    var new_hum = data["humidity"]

    //console.log(new_temp)
    //console.log(new_hum)
    var ptagTemp = document.createElement('p')
    var ptagHum = document.createElement('p')

    var textTemp = time + " - temperature: " + parseFloat(new_temp) + "°C\n"
    var textHum = time + "- humidity: " + parseFloat(new_hum)
    var pcontentTemp = document.createTextNode(textTemp)
    var pcontentHum = document.createTextNode(textHum)

    ptagTemp.appendChild(pcontentTemp)
    document.getElementById("infobox1").appendChild(ptagTemp)

    ptagHum.appendChild(pcontentHum)
    document.getElementById("infobox2").appendChild(ptagHum)

    chartTemp.data.labels.push(time)
    chartTemp.data.datasets[0].data.push(new_temp)

    chartHum.data.labels.push(time)
    chartHum.data.datasets[0].data.push(new_hum)

    chartTemp.update()
    chartHum.update()
    updateAggregateValuesTemp(chartTemp, chartHum)

  }
  else if (data.includes("soil_humidity")) {
    data = JSON.parse(event.data)
    var new_soil = data["soil_humidity"]

    var ptagSoilHum = document.createElement('p')
    var textSoilHum = time + "- humidity: " + parseFloat(new_soil)
    var pcontentSoilHum = document.createTextNode(textSoilHum)

    ptagSoilHum.appendChild(pcontentSoilHum)
    document.getElementById("infobox3").appendChild(ptagSoilHum)

    chartSoil.data.labels.push(time)
    chartSoil.data.datasets[0].data.push(parseFloat(new_soil))
    chartSoil.update()
    updateAggregateValuesSoil(chartSoil)
  }



}
socket.onclose = function (event) {
  if (event.wasClean) {
    console.log("Connection Closed Correctly")
  }
  else {
    console.log("Connection Died")
  }
}
socket.onerror = function (error) {
  console.log(error.message);
  //alert("CANNOT CONNECT TO WESOCKET")
}

//DEFINITION OF UTILITY FUNCTIONS

//Functions to Change Button State
function changeRelayButtonStatus(button_ID) {
  var elements = document.getElementById("relay_buttons").children;

  for (var i = 0; i < elements.length; i++) {
    if (elements[i].id == button_ID) {
      elements[i].disabled = true;
    }
    else {
      elements[i].disabled = false;
    }
  }
}
function changeServoButtonStatus(button_ID) {
  //localStorage.setItem('myCat', 'Tom');
  //localStorage.getItem('myCat');
  var elements = document.getElementById("servo_buttons").children;
  for (var i = 0; i < elements.length; i++) {
    if (elements[i].id == button_ID) {
      elements[i].disabled = true;
    }
    else {
      elements[i].disabled = false;
    }
  }

}

//Functions to Work with LocalStorage
function setLocalStorage(command) { //forse aggiungo pure la temperatura
  if (command.includes('s')) {
    localStorage.setItem('servo_last_status', command)
  }
  else if (command.includes("r")) {
    localStorage.setItem('relay_last_status', command)
  }
}
function getLocalStorage(field) {
  var result = localStorage.getItem(field)
  if (result) {
    return result
  }
  else {
    return 1
  }
}

//Asyn Function to call REST API
async function callTempHum() {
  var result = await fetch("https://o3qpjaxvq7.execute-api.us-east-1.amazonaws.com/v1/temperature_humidity")
    .then(data => { return data.json(); }).then(data => { return data.body })
    .then(data => {
      return data.sort(function (a, b) {
        return a.id - b.id;
      })
    })
    .catch(err => {
      //console.error(err);
      //alert("CANNOT GET TEMPERATURE AND HUMIDITY DATA");
      return 1;
    });
  //console.log(result)
  if (result == 1) {
    return;
  }

  result.forEach(element => {
    var time = new Date(element["id"])
    time = parseInt(time.getUTCHours()) + ":" + parseInt(time.getUTCMinutes()) + ":" + parseInt(time.getUTCSeconds())

    if (!chartTemp.data.labels.includes(time)) {

      var temp = parseFloat(element["value"]["temperature"]);
      var hum = parseFloat(element["value"]["humidity"])

      //console.log(typeof(temp))

      var ptagTemp = document.createElement('p')
      var ptagHum = document.createElement('p')

      var textTemp = time + " - temperature: " + parseFloat(temp) + "°C\n"
      var textHum = time + "- humidity: " + parseFloat(hum)
      var pcontentTemp = document.createTextNode(textTemp)
      var pcontentHum = document.createTextNode(textHum)

      ptagTemp.appendChild(pcontentTemp)
      document.getElementById("infobox1").appendChild(ptagTemp)

      ptagHum.appendChild(pcontentHum)
      document.getElementById("infobox2").appendChild(ptagHum)

      chartTemp.data.labels.push(time);
      chartTemp.data.datasets[0].data.push(temp);

      chartHum.data.labels.push(time)
      chartHum.data.datasets[0].data.push(hum);

    }

  });
  chartTemp.update();
  chartHum.update();
}
async function callSoil() {
  var result = await fetch("https://o3qpjaxvq7.execute-api.us-east-1.amazonaws.com/v1/soil_humidity")
    .then(data => { return data.json(); }).then(data => { return data.body })
    .then(data => {
      return data.sort(function (a, b) {
        return a.id - b.id;
      })
    })
    .catch(err => {
      //console.error(err);
      //alert("CANNOT GET SOIL HUMIDITY DATA");
      return 1;
    })

  if (result == 1) {
    return;
  }
  //console.log(result)
  result.forEach(element => {

    var time = new Date(element["id"])
    time = parseInt(time.getUTCHours()) + ":" + parseInt(time.getUTCMinutes()) + ":" + parseInt(time.getUTCSeconds())


    if (!chartTemp.data.labels.includes(time)) {

      var soil_hum = parseFloat(element["value"]["soil_humidity"])
      var ptagSoilHum = document.createElement('p')

      //console.log(typeof(soil_hum))

      var textSoilHum = time + "- humidity: " + parseFloat(soil_hum)
      var pcontentSoilHum = document.createTextNode(textSoilHum)

      ptagSoilHum.appendChild(pcontentSoilHum)
      document.getElementById("infobox3").appendChild(ptagSoilHum)


      chartSoil.data.labels.push(time);
      chartSoil.data.datasets[0].data.push(soil_hum)

    }
  })
  chartSoil.update()
}
async function sendCommand(commad) {
  //console.log(commad)

  if (commad == "undefined" || commad == "") {
    //console.log("err")
    alert("Insert a Value before Sending")
  }
  else {
    var payload = {};
    if (isNaN(commad)) {
      payload = {
        "command": commad
      }
    }
    else {
      payload = {
        "new_temp": commad
      }
    }

    var param = {
      method: 'POST',
      mode: 'no-cors',
      body: JSON.stringify(payload)
    }
    var result = await fetch("https://o3qpjaxvq7.execute-api.us-east-1.amazonaws.com/v1/", param)
      .then(data => { console.log("EHI"); console.log(data.status); console.log("EHO"); return data; })
      .catch(err => { console.log(err); return 1 })
    if (result == 1) {
      alert("CANNOT SEND THE COMMAND, TRY AGAIN")
      return;
    }

    setLocalStorage(commad)
    if (commad.includes('s')) changeServoButtonStatus(commad)
    else if (commad.includes('r')) changeRelayButtonStatus(commad)
  }
}

//Function for computing and setting the aggregate values
function updateAggregateValuesTemp(chart1, chart2) {
  var array_temp = chart1.data.datasets[0].data
  var array_hum = chart2.data.datasets[0].data

  var sum_temp = array_temp.reduce((a, b) => parseInt(a) + parseInt(b), 0);
  var avg_temp = (sum_temp / array_temp.length) || 0;

  var sum_hum = array_hum.reduce((a, b) => parseInt(a) + parseInt(b), 0);
  var avg_hum = (sum_hum / array_hum.length) || 0;

  if (array_temp.length != 0) {
    var max_temp = Math.max.apply(Math, array_temp)
    var max_hum = Math.max.apply(Math, array_hum)

    var min_temp = Math.min.apply(Math, array_temp)
    var min_hum = Math.min.apply(Math, array_hum)

    var delta_temp = array_temp[array_temp.length - 1] - array_temp[0]
    var delta_hum = array_hum[array_hum.length - 1] - array_hum[0]

    document.getElementById("avg_temp").innerHTML = "AVG in last Hour:" + Math.round(avg_temp * 100) / 100 + "°C, " + Math.round(avg_hum * 100) / 100 + "%"
    document.getElementById("MAX_temp").innerHTML = "MAX in last Hour:" + max_temp + "°C, " + max_hum + "%"
    document.getElementById("MIN_temp").innerHTML = "MIN in last Hour:" + min_temp + "°C, " + min_hum + "%"
    document.getElementById("delta_temp").innerHTML = "Variation in last Hour:" + Math.round(delta_temp * 100) / 100 + "°C, " + Math.round(delta_hum * 100) / 100 + "%"
    //commentato perchè se faccio danni quello sotto funziona
    //document.getElementById("delta_temp").innerHTML = "Variation in last Hour:" + delta_temp.toString() + "°C, " + delta_hum.toString() + "%"
  }


}
function updateAggregateValuesSoil(chart1) {

  var array_soil = chart1.data.datasets[0].data
  var sum_soil = array_soil.reduce((a, b) => a + b, 0);
  var avg_soil = (sum_soil / array_soil.length) || 0;

  if (array_soil.length != 0) {
    var max_soil = Math.max.apply(Math, array_soil)
    var min_soil = Math.min.apply(Math, array_soil)
    var delta_soil = array_soil[array_soil.length - 1] - array_soil[0]

    document.getElementById("avg_soil").innerHTML = "AVG in last Hour:" + Math.round(avg_soil * 100) / 100 + "%"
    document.getElementById("MAX_soil").innerHTML = "MAX in last Hour:" + max_soil + "%"
    document.getElementById("MIN_soil").innerHTML = "MIN in last Hour:" + min_soil + "%"
    document.getElementById("delta_soil").innerHTML = "Variation in last Hour:" + Math.round(delta_soil * 100) / 100 + "%"
    // document.getElementById("delta_soil").innerHTML = "Variation in last Hour:" + delta_soil.toString() + "%"

  }

}
