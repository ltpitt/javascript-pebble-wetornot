var UI = require('ui');
var ajax = require('ajax');
var Vector2 = require('vector2');
var Settings = require('settings');

var loadingCard = new UI.Card({
  title: 'Loading data...'
});
loadingCard.show();

var apiKey = Settings.option('apiKey') || 'default_api_key';

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
    var forecastTime = new Date(item.utcdatetime);

    if (forecastTime > now && item.precipitation !== previousPrecipitation) {
      var description = 'Very light rain';
      if (item.precipitation > 0.5) {
        description = 'Light rain';
      }
      if (item.precipitation > 2.5) {
        description = 'Moderate rain';
      }
      if (item.precipitation > 7.5) {
        description = 'Heavy rain';
      }
      if (item.precipitation > 10) {
        description = 'Very heavy rain';
      }

      menuItems.push({
        title: item.utcdatetime.split("T")[1],
        subtitle: item.precipitation + ' mm of rain',
        data: {
          datetime: item.utcdatetime,
          precipitation: item.precipitation,
          description: description
        }
      });
      previousPrecipitation = item.precipitation;
    }
  });

  var menu = new UI.Menu({
    sections: [{
      title: 'Rain Forecast',
      items: menuItems
    }]
  });

  menu.on('select', function(e) {
    var item = e.item.data;
    var date = new Date(item.datetime);
    var humanReadableDate = date.toLocaleString();
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
});

Pebble.addEventListener('showConfiguration', function() {
  Pebble.openURL('http://your-config-page-url.com');
});

Pebble.addEventListener('webviewclosed', function(e) {
  var configData = JSON.parse(decodeURIComponent(e.response));
  Settings.option('apiKey', configData.apiKey);
});

