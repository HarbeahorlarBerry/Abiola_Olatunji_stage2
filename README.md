🌍 Country Currency & Exchange API
🧑‍💻 Author

Name: Abiola Olatunji
Stage: Backend Stage 2
Task: Country Currency & Exchange API

🧾 Overview

A RESTful API that fetches real-time country data and currency exchange rates from external APIs, stores them in a local database, and provides CRUD operations, filtering, sorting, and data visualization.

⚙️ Tech Stack

Node.js + Express.js

MySQL (via Sequelize or mysql2)

Axios (for external API calls)

Sharp / Chart.js (for image generation)

dotenv (for environment configuration)

🧩 Features

✅ Fetch & store all countries with currency & exchange data
✅ Calculate estimated GDP automatically
✅ CRUD operations on country data
✅ Filter and sort results (by region, currency, GDP, etc.)
✅ Generate an image chart of country GDPs
✅ Auto-refresh background data with timeout
✅ Proper error handling & JSON responses

🔧 Installation & Setup

Clone the repository:

git clone https://github.com/HarbeahorlarBerry/Abiola_Olatunji_stage2.git
cd Abiola_Olatunji_stage2


Install dependencies:

npm install


Setup Environment Variables:

Create a .env file in the root directory and add the following:

PORT=6000
EXTERNAL_COUNTRIES_API=https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies
EXTERNAL_EXCHANGE_API=https://open.er-api.com/v6/latest/USD
REFRESH_TIMEOUT_MS=15000
CACHE_DIR=./cache

Variable	Description
PORT	Local server port (default: 6000)
EXTERNAL_COUNTRIES_API	Fetches name, capital, region, population, and currencies
EXTERNAL_EXCHANGE_API	Provides live USD exchange rates
REFRESH_TIMEOUT_MS	Background refresh delay in ms
CACHE_DIR	Folder for local cache files

Start the application:

npm run dev

🚀 API Endpoints
Method	Endpoint	Description
POST	/countries/refresh	Fetch and refresh data from external APIs
GET	/countries	Get all countries (with optional filters & sorting)
GET	/countries/:name	Get details of a specific country
DELETE	/countries/:name	Delete a specific country by name
GET	/countries/image	Generate GDP visualization image
GET	/status	View refresh status & summary

🔍 Example Filters
GET /countries?region=Africa
GET /countries?currency=USD
GET /countries?sortBy=gdp&order=desc

🧠 Example Response
{
  "name": "Nigeria",
  "capital": "Abuja",
  "region": "Africa",
  "population": 206139587,
  "currency_code": "NGN",
  "exchange_rate": 1462.5749,
  "estimated_gdp": 250737459.49,
  "flag_url": "https://flagcdn.com/ng.svg",
  "last_refreshed_at": "2025-10-25T22:51:52.000Z"
}

🖼️ Image Endpoint Example

GET /countries/image

Returns a PNG image summary of top countries by GDP (generated with Chart.js or Sharp).

🌐 Deployment

You can deploy this API using:

Railway

🧾 License

MIT License © 2025 Abiola Olatunji





🧾 STEP 4 — Test with Postman
Route	Method	URL	Description
/countries/refresh	POST	http://localhost:6000/countries/refresh	Refresh DB
/countries	GET	http://localhost:6000/countries?region=Africa&sort=gdp_desc	Filter + Sort
/countries/:name	GET	http://localhost:6000/countries/Nigeria	Get by name
/countries/:name	DELETE	http://localhost:6000/countries/Nigeria	Delete country
/status	GET	http://localhost:6000/status	Check stats
/countries/image	GET	http://localhost:6000/countries/image	Get summary image
🌍 STEP 5 — Deploy on Railway




DB_NAME=defaultdb
DB_PORT=14556
DB_HOST=mysql-262f63ce-abiolaolatunji100-aa34.d.aivencloud.com
DB_USER=avnadmin