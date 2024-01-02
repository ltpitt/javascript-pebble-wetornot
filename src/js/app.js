var UI = require('ui');
var ajax = require('ajax');
var Vector2 = require('vector2');
var Settings = require('settings');

var loadingCard = new UI.Card({
  title: 'Loading data...'
});
loadingCard.show();

var apiKey = Settings.option('apiKey') || '3c4a3037-85e6-4d1e-ad6c-f3f6e4b75f2f';

function fetchWeather() {
  return new Promise(function(resolve, reject) {
    navigator.geolocation.getCurrentPosition(function(position) {
      var lat = position.coords.latitude;
      var lon = position.coords.longitude;

      ajax(
        {
          url: 'https://graphdata.buienradar.nl/2.0/forecast/geo/RainHistoryForecast?lat=' + lat + '&lon=' + lon + '&ak=' + apiKey,
          type: 'json'
        },
        function(data) {
          var forecasts = data.forecasts;

          if (forecasts) {
            resolve(forecasts);
          } else {
            reject('Error fetching weather data.');
          }
        },
        function(error) {
          reject('Error fetching weather data: ' + error);
        }
      );
    });
  });
}

fetchWeather().then(function(forecasts) {
  var menuItems = [];
  var previousPrecipitation = null;

  var now = new Date();

  forecasts.forEach(function(item) {
    var forecastTime = new Date(item.datetime);

    if (forecastTime > now && item.precipitation !== previousPrecipitation) {
      var description = 'Dry weather';
      var icon = 'images/no_rain.png';
      if (item.precipitation > 0.0) {
        description = 'Light rain';
        icon = 'images/light_rain.png';
      }
      if (item.precipitation > 1.0) {
        description = 'Moderate rain';
        icon = 'images/moderate_rain.png';
      }
      if (item.precipitation > 7.5) {
        description = 'Heavy rain';
        icon = 'images/heavy_rain.png';
      }

      menuItems.push({
        title: item.datetime.split("T")[1],
        subtitle: item.precipitation + ' mm of rain',
        icon: icon,
        data: {
          datetime: item.datetime,
          precipitation: item.precipitation,
          description: description
        }
      });
      previousPrecipitation = item.precipitation;
    }
  });

  var menu = new UI.Menu({
    sections: [{
      title: 'Wet or not',
      items: menuItems
    }]
  });

  menu.on('select', function(e) {
    var item = e.item.data;
    var date = new Date(item.datetime);
    var humanReadableDate = date.toLocaleDateString();
    var precipitation = item.precipitation;
    var description = item.description;

    var detailCard = new UI.Card({
      title: humanReadableDate,
      subtitle: precipitation + ' mm of rain',
      body: description,
      icon: 'images/' + description.replace(/ /g, '_').toLowerCase() + '.png',
      scrollable: true
    });

    detailCard.show();
  });

  loadingCard.hide();
  menu.show();
}).catch(function(error) {
  loadingCard.subtitle(error);

  var errorCard = new UI.Card({
    title: 'Error',
    body: error
  });
  errorCard.show();
  loadingCard.hide();

});

Pebble.addEventListener('showConfiguration', function() {
  Pebble.openURL('https://davidenastri.it/wetornot');
});

Pebble.addEventListener('webviewclosed', function(e) {
  var configData = JSON.parse(decodeURIComponent(e.response));
  Settings.option('apiKey', configData.apiKey);
});
