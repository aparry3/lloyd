import { defineTool } from '@agent-runner/core';
import { z } from 'zod';

const weatherInput = z.object({
  location: z.string().describe('City name, zip code, or location (e.g., "New York", "90210", "Paris, France")'),
});

/**
 * Geocode a location string to lat/lon using Open-Meteo's geocoding API (no key needed).
 */
async function geocode(location: string): Promise<{ lat: number; lon: number; name: string; country: string; timezone: string } | null> {
  try {
    const url = new URL('https://geocoding-api.open-meteo.com/v1/search');
    url.searchParams.set('name', location);
    url.searchParams.set('count', '1');
    url.searchParams.set('language', 'en');

    const res = await fetch(url.toString());
    if (!res.ok) return null;

    const data = await res.json();
    const result = data.results?.[0];
    if (!result) return null;

    return {
      lat: result.latitude,
      lon: result.longitude,
      name: result.name,
      country: result.country || '',
      timezone: result.timezone || 'UTC',
    };
  } catch {
    return null;
  }
}

/**
 * WMO weather code to description.
 */
function weatherDescription(code: number): string {
  const descriptions: Record<number, string> = {
    0: 'Clear sky ☀️',
    1: 'Mainly clear 🌤',
    2: 'Partly cloudy ⛅',
    3: 'Overcast ☁️',
    45: 'Foggy 🌫',
    48: 'Freezing fog 🌫❄️',
    51: 'Light drizzle 🌧',
    53: 'Moderate drizzle 🌧',
    55: 'Dense drizzle 🌧',
    56: 'Freezing drizzle 🌧❄️',
    57: 'Heavy freezing drizzle 🌧❄️',
    61: 'Light rain 🌧',
    63: 'Moderate rain 🌧',
    65: 'Heavy rain 🌧💧',
    66: 'Freezing rain 🌧❄️',
    67: 'Heavy freezing rain 🌧❄️',
    71: 'Light snow 🌨',
    73: 'Moderate snow 🌨',
    75: 'Heavy snow ❄️',
    77: 'Snow grains ❄️',
    80: 'Light showers 🌦',
    81: 'Moderate showers 🌦',
    82: 'Violent showers ⛈',
    85: 'Light snow showers 🌨',
    86: 'Heavy snow showers 🌨❄️',
    95: 'Thunderstorm ⛈',
    96: 'Thunderstorm with hail ⛈🧊',
    99: 'Thunderstorm with heavy hail ⛈🧊',
  };
  return descriptions[code] || `Weather code ${code}`;
}

/**
 * Tool: get current weather and forecast.
 */
export const getWeather = defineTool({
  name: 'get_weather',
  description:
    'Get current weather and forecast for a location. Use when the user asks about weather, temperature, or if they should bring an umbrella/jacket.',
  input: weatherInput as z.ZodSchema,
  async execute(input: unknown) {
    const { location } = input as z.infer<typeof weatherInput>;

    // Geocode the location
    const geo = await geocode(location);
    if (!geo) {
      return { error: `Could not find location: "${location}". Try a city name like "New York" or "London".` };
    }

    try {
      // Fetch current weather + 3-day forecast from Open-Meteo
      const url = new URL('https://api.open-meteo.com/v1/forecast');
      url.searchParams.set('latitude', String(geo.lat));
      url.searchParams.set('longitude', String(geo.lon));
      url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m');
      url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max');
      url.searchParams.set('temperature_unit', 'fahrenheit');
      url.searchParams.set('wind_speed_unit', 'mph');
      url.searchParams.set('forecast_days', '3');
      url.searchParams.set('timezone', geo.timezone);

      const res = await fetch(url.toString());
      if (!res.ok) {
        return { error: 'Weather service unavailable. Try again later.' };
      }

      const data = await res.json();
      const current = data.current;
      const daily = data.daily;

      const result: any = {
        location: `${geo.name}, ${geo.country}`,
        current: {
          temperature: `${Math.round(current.temperature_2m)}°F`,
          feelsLike: `${Math.round(current.apparent_temperature)}°F`,
          humidity: `${current.relative_humidity_2m}%`,
          wind: `${Math.round(current.wind_speed_10m)} mph`,
          conditions: weatherDescription(current.weather_code),
        },
        forecast: [] as any[],
      };

      // 3-day forecast
      if (daily?.time) {
        for (let i = 0; i < daily.time.length; i++) {
          const date = new Date(daily.time[i] + 'T12:00:00');
          result.forecast.push({
            day: date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
            high: `${Math.round(daily.temperature_2m_max[i])}°F`,
            low: `${Math.round(daily.temperature_2m_min[i])}°F`,
            conditions: weatherDescription(daily.weather_code[i]),
            rainChance: daily.precipitation_probability_max[i] != null
              ? `${daily.precipitation_probability_max[i]}%`
              : undefined,
          });
        }
      }

      return result;
    } catch (err: any) {
      return { error: `Weather lookup failed: ${err.message}` };
    }
  },
});
