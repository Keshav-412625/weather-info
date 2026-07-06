const API_KEY = '70f977e9a263f31be65fb00019cbfdf9';
const WEATHER_URL = 'https://api.openweathermap.org/data/2.5/weather';
const FORECAST_URL = 'https://api.openweathermap.org/data/2.5/forecast';

const tempEl = document.getElementById('temp');
const conditionEl = document.getElementById('condition');
const humidityEl = document.getElementById('humidity');
const windSpeedEl = document.getElementById('windSpeed');
const feelsLikeEl = document.getElementById('feelsLike');
const pressureEl = document.getElementById('pressure');
const uvIndexEl = document.getElementById('uvIndex');
const visibilityEl = document.getElementById('visibility');
const iconEl = document.getElementById('weatherIcon');
const cityInputEl = document.getElementById('cityInput');
const searchBtnEl = document.getElementById('searchBtn');
const errorMsgEl = document.getElementById('errorMsg');
const weatherDataEl = document.getElementById('weatherData');
const cityNameEl = document.getElementById('cityName');
const forecastDataEl = document.getElementById('forecastData');
const forecastListEl = document.getElementById('forecastList');
const forecastControlsEl = document.getElementById('forecastControls');
const forecastTitleEl = document.getElementById('forecastTitle');

let lastForecastList = [];
let lastCity = '';

function setTheme(condition = '') {
    const text = condition.toLowerCase();
    let theme = 'default-theme';

    if (text.includes('rain')) theme = 'Rain';
    else if (text.includes('cloud')) theme = 'Clouds';
    else if (text.includes('snow')) theme = 'Snow';
    else if (text.includes('clear')) theme = 'Clear';

    document.body.className = theme;
}

function setLoading(isLoading) {
    searchBtnEl.disabled = isLoading;
    searchBtnEl.textContent = isLoading ? 'Loading...' : 'Search';
}

function showError(message = '') {
    errorMsgEl.textContent = message;
    errorMsgEl.classList.toggle('hidden', !message);
    weatherDataEl.classList.add('hidden');
    forecastDataEl.classList.add('hidden');
    forecastControlsEl.classList.add('hidden');
}

function showWeather(data) {
    const weather = data.weather?.[0] || {};
    const main = data.main || {};
    const wind = data.wind || {};

    cityNameEl.textContent = data.name || 'City Name';
    tempEl.textContent = main.temp != null ? Math.round(main.temp) : '--';
    conditionEl.textContent = weather.description || weather.main || '--';
    humidityEl.textContent = main.humidity != null ? main.humidity : '--';
    windSpeedEl.textContent = wind.speed != null ? wind.speed : '--';
    feelsLikeEl.textContent = main.feels_like != null ? Math.round(main.feels_like) : '--';
    pressureEl.textContent = main.pressure != null ? main.pressure : '--';
    visibilityEl.textContent = data.visibility != null ? (data.visibility / 1000).toFixed(1) : '--';
    uvIndexEl.textContent = '--';

    if (weather.icon) {
        iconEl.src = `https://openweathermap.org/img/wn/${weather.icon}@2x.png`;
        iconEl.alt = weather.description || 'Weather condition icon';
        iconEl.classList.remove('hidden');
    } else {
        iconEl.classList.add('hidden');
    }

    setTheme(weather.main || weather.description || '');
    errorMsgEl.classList.add('hidden');
    weatherDataEl.classList.remove('hidden');
    forecastControlsEl.classList.remove('hidden');
}

function groupForecastByDate(list) {
    const grouped = {};
    list.forEach(item => {
        const date = item.dt_txt?.split(' ')[0];
        if (!date) return;
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(item);
    });
    return grouped;
}

function formatDateLabel(dateStr) {
    const date = new Date(dateStr + 'T12:00:00');
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function renderForecast(list, daysCount) {
    const grouped = groupForecastByDate(list);
    const dates = Object.keys(grouped).slice(0, daysCount);

    forecastTitleEl.textContent = daysCount === 1 ? 'Tomorrow' : `Next ${daysCount} Days`;

    forecastListEl.innerHTML = dates.map(date => {
        const items = grouped[date];
        const midday = items.find(i => i.dt_txt?.includes('12:00:00')) || items[Math.floor(items.length / 2)];
        const weather = midday.weather?.[0] || {};
        const temp = midday.main?.temp != null ? Math.round(midday.main.temp) : '--';
        const desc = weather.description || weather.main || '--';
        const icon = weather.icon ? `https://openweathermap.org/img/wn/${weather.icon}@2x.png` : '';

        return `
            <div class="forecast-card">
                <div class="forecast-left">
                    ${icon ? `<img src="${icon}" alt="${desc}">` : ''}
                    <div>
                        <div class="forecast-day">${formatDateLabel(date)}</div>
                        <div class="forecast-desc">${desc}</div>
                    </div>
                </div>
                <div class="forecast-temp">${temp}°C</div>
            </div>
        `;
    }).join('');

    forecastDataEl.classList.remove('hidden');
}

function setActiveForecastButton(range) {
    document.querySelectorAll('.forecast-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.range === range);
    });
}

function showForecastForRange(range) {
    if (!lastForecastList.length) return;

    let daysCount = 5;
    if (range === 'tomorrow') daysCount = 1;
    else if (range === '3') daysCount = 3;
    else if (range === '5') daysCount = 5;
    else if (range === '7') daysCount = 7;
    else if (range === '10') daysCount = 10;

    setActiveForecastButton(range);
    renderForecast(lastForecastList, daysCount);
}

async function fetchWeatherByCity(city) {
    const weatherUrl = `${WEATHER_URL}?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
    const forecastUrl = `${FORECAST_URL}?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;

    try {
        setLoading(true);
        showError('');

        const [weatherRes, forecastRes] = await Promise.all([
            fetch(weatherUrl),
            fetch(forecastUrl)
        ]);

        const weatherData = await weatherRes.json();
        const forecastData = await forecastRes.json();

        if (!weatherRes.ok || String(weatherData.cod) !== '200') {
            throw new Error(weatherData.message || 'City not found');
        }

        if (!forecastRes.ok || String(forecastData.cod) !== '200') {
            throw new Error(forecastData.message || 'Forecast not found');
        }

        lastCity = city;
        lastForecastList = forecastData.list || [];
        showWeather(weatherData);
        showForecastForRange('5');
    } catch (error) {
        showError(error.message || 'City not found');
    } finally {
        setLoading(false);
    }
}

function fetchWeather(city) {
    const query = city.trim();

    if (!query) {
        showError('Please enter a city name');
        return;
    }

    fetchWeatherByCity(query);
}

searchBtnEl.addEventListener('click', () => fetchWeather(cityInputEl.value));
cityInputEl.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') fetchWeather(cityInputEl.value);
});

forecastControlsEl.addEventListener('click', (event) => {
    const btn = event.target.closest('.forecast-btn');
    if (!btn) return;
    showForecastForRange(btn.dataset.range);
});

showError('');