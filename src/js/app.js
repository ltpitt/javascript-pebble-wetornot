var UI = require('ui');
var ajax = require('ajax');
var Vector2 = require('vector2');
var Settings = require('settings');


var splashScreen = new UI.Card({ banner: 'IMAGE_SPLASHSCREEN' });
splashScreen.show();

var apiKey = Settings.option('apiKey') || '3c4a3037-85e6-4d1e-ad6c-f3f6e4b75f2f';

function fetchWeather() {
    return new Promise(function(resolve, reject) {
        navigator.geolocation.getCurrentPosition(function(position) {
            var lat = position.coords.latitude;
            var lon = position.coords.longitude;

            ajax({
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

function getWeatherDisplayData(precipitation) {
    var description = 'Dry weather';
    var icon = 'images/no_rain.png';

    if (precipitation > 7.5) {
        description = 'Heavy rain';
        icon = 'images/heavy_rain.png';
    } else if (precipitation > 1.0) {
        description = 'Moderate rain';
        icon = 'images/moderate_rain.png';
    } else if (precipitation > 0.0) {
        description = 'Light rain';
        icon = 'images/light_rain.png';
    }

    return { "description": description, "icon": icon };
}

function createMenuCard(menuItems) {
    var menu = new UI.Menu({
        sections: [{
            title: 'Wet or... Not?',
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

    menu.show();
}


function prepareMenuItems(forecasts) {
    var menuItems = [];
    var previousPrecipitation = null;

    var now = new Date();

    forecasts.forEach(function(item) {
        var forecastTime = new Date(item.datetime);

        if (forecastTime > now && item.precipitation !== previousPrecipitation) {
            var weatherDisplayData = getWeatherDisplayData(item.precipitation);
            var description = weatherDisplayData['description'];
            var icon = weatherDisplayData['icon'];

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

    return menuItems;

}

var weatherDataPromise = fetchWeather();

setTimeout(function() {
    weatherDataPromise
        .then(prepareMenuItems)
        .then(createMenuCard)
        .then(function() { splashScreen.hide(); })
        .catch(function(error) {
            console.error('Error fetching weather data: ' + error);
            loadingCard.subtitle(error);

            var errorCard = new UI.Card({
                title: 'Error',
                body: error
            });
            errorCard.show();
        });
}, 2000);

Pebble.addEventListener('showConfiguration', function() {
    Pebble.openURL('https://davidenastri.it/wetornot');
});

Pebble.addEventListener('webviewclosed', function(e) {
    var configData = JSON.parse(decodeURIComponent(e.response));
    Settings.option('apiKey', configData.apiKey);
});
