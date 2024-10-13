const fs = require('fs');
const path = require('path');
const express = require('express');
const fetch = require('node-fetch');
const app = express();
const cors = require('cors'); // Import the CORS package
const port = 3001;
app.use(cors());

const csvFilePath = path.join(__dirname, 'city_coordinates.csv');
const imagesFolderPath = path.join(__dirname, 'images');
console.log(csvFilePath);
console.log(imagesFolderPath);
//lat,long,city,country
function parseCSV(filePath) {
    const data = fs.readFileSync(filePath, 'utf8');
    const rows = data.split('\n').map(row => row.trim()).filter(row => row.length > 0);
    const headers = rows[0].split(',').map(header => header.trim());
    return rows.slice(1).map(row => {
        const values = row.split(',').map(value => value.trim());
        return headers.reduce((acc, header, index) => {
            acc[header] = values[index];
            return acc;
        }, {});
    });
}

async function fetchWeather(latitude, longitude) {
    try {
        const response = await fetch(`https://www.7timer.info/bin/api.pl?lon=${longitude}&lat=${latitude}&product=civil&output=json`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        console.log(data);

        if (!data.dataseries || data.dataseries.length === 0) {
            throw new Error('No weather data available');
        }
        return data;
    } catch (error) {
        console.error('Error fetching weather data:', error);
        throw error;
    }
}

function getWeatherImage(weatherCondition) {
    const imagePath = path.join(imagesFolderPath, `${weatherCondition}.png`);
    return fs.existsSync(imagePath) ? `/images/${weatherCondition}.png` : null;
}

const locations = parseCSV(csvFilePath);
console.log(locations); 
app.use('/images', express.static(imagesFolderPath));

app.get('/weather', async (req, res) => {
    console.log('Received query params:', req.query); // Log the query parameters

    const { country, city } = req.query;
    const location = locations.find(loc => loc.city === city && loc.country === country);

    if (!location) {
        return res.status(404).json({ error: 'Location not found' });
    }

    try {
        const weatherData = await fetchWeather(location.latitude, location.longitude);
        const weatherCondition = weatherData.dataseries[0].weather;
        const weatherImage = getWeatherImage(weatherCondition);
        console.log('Weather data fetched:', weatherData); // Log weather data

        res.json({
            weatherCondition,
            weatherImage: weatherImage ? `/images/${weatherCondition}.png` : null
        });
    } catch (error) {
        console.error('Error fetching weather data:', error);
        res.status(500).json({ error: 'Error fetching weather data' });
    }
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});



