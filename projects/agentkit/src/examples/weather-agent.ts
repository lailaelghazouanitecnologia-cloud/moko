import { BaseAgent } from '../core/base-agent';
import { WeatherAPI, Location, Weather, Forecast, HourlyForecast, Alert, AlertType, AlertConfig, HistoricalWeather, CityComparison, PollenData, AQI, Times, Unit } from '../weather';

export class WeatherAgent extends BaseAgent {
    private weatherApi: WeatherAPI;
    private locationCache: Map<string, Location>;
    private alertSubscriptions: Map<string, AlertConfig>;

    constructor() {
        super();
        this.weatherApi = new WeatherAPI();
        this.locationCache = new Map();
        this.alertSubscriptions = new Map();
    }

    async getCurrentWeather(location: string): Promise<Weather> {
        const cachedLocation = this.locationCache.get(location);
        if (cachedLocation) {
            return this.weatherApi.getCurrentWeather(cachedLocation);
        }
        const locations = await this.searchLocation(location);
        if (locations.length === 0) {
            throw new Error(`Location not found: ${location}`);
        }
        this.locationCache.set(location, locations[0]);
        return this.weatherApi.getCurrentWeather(locations[0]);
    }

    async getForecast(location: string, days: number): Promise<Forecast[]> {
        const cachedLocation = this.locationCache.get(location);
        if (cachedLocation) {
            return this.weatherApi.getForecast(cachedLocation, days);
        }
        const locations = await this.searchLocation(location);
        if (locations.length === 0) {
            throw new Error(`Location not found: ${location}`);
        }
        this.locationCache.set(location, locations[0]);
        return this.weatherApi.getForecast(locations[0], days);
    }

    async getHourlyForecast(location: string, hours: number): Promise<HourlyForecast[]> {
        const cachedLocation = this.locationCache.get(location);
        if (cachedLocation) {
            return this.weatherApi.getHourlyForecast(cachedLocation, hours);
        }
        const locations = await this.searchLocation(location);
        if (locations.length === 0) {
            throw new Error(`Location not found: ${location}`);
        }
        this.locationCache.set(location, locations[0]);
        return this.weatherApi.getHourlyForecast(locations[0], hours);
    }

    async searchLocation(query: string): Promise<Location[]> {
        return this.weatherApi.searchLocation(query);
    }

    async getAlerts(location: string): Promise<Alert[]> {
        const cachedLocation = this.locationCache.get(location);
        if (cachedLocation) {
            return this.weatherApi.getAlerts(cachedLocation);
        }
        const locations = await this.searchLocation(location);
        if (locations.length === 0) {
            throw new Error(`Location not found: ${location}`);
        }
        this.locationCache.set(location, locations[0]);
        return this.weatherApi.getAlerts(locations[0]);
    }

    async subscribeAlerts(location: string, types: AlertType[]): Promise<string> {
        const cachedLocation = this.locationCache.get(location);
        let loc: Location;
        if (cachedLocation) {
            loc = cachedLocation;
        } else {
            const locations = await this.searchLocation(location);
            if (locations.length === 0) {
                throw new Error(`Location not found: ${location}`);
            }
            loc = locations[0];
            this.locationCache.set(location, loc);
        }
        const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const config: AlertConfig = {
            location: loc,
            types: types,
            webhookUrl: `https://api.example.com/webhooks/weather/${subscriptionId}`
        };
        this.alertSubscriptions.set(subscriptionId, config);
        await this.weatherApi.subscribeAlerts(loc, types, config.webhookUrl);
        return subscriptionId;
    }

    async unsubscribeAlerts(subscriptionId: string): Promise<boolean> {
        const config = this.alertSubscriptions.get(subscriptionId);
        if (!config) {
            return false;
        }
        await this.weatherApi.unsubscribeAlerts(config.webhookUrl);
        this.alertSubscriptions.delete(subscriptionId);
        return true;
    }

    async getHistoricalWeather(location: string, date: string): Promise<HistoricalWeather> {
        const cachedLocation = this.locationCache.get(location);
        if (cachedLocation) {
            return this.weatherApi.getHistoricalWeather(cachedLocation, date);
        }
        const locations = await this.searchLocation(location);
        if (locations.length === 0) {
            throw new Error(`Location not found: ${location}`);
        }
        this.locationCache.set(location, locations[0]);
        return this.weatherApi.getHistoricalWeather(locations[0], date);
    }

    async compareCities(cities: string[]): Promise<CityComparison> {
        const cityData = await Promise.all(
            cities.map(async city => {
                const locations = await this.searchLocation(city);
                if (locations.length === 0) {
                    throw new Error(`City not found: ${city}`);
                }
                this.locationCache.set(city, locations[0]);
                const weather = await this.weatherApi.getCurrentWeather(locations[0]);
                return { name: city, temperature: weather.temperature, condition: weather.condition };
            })
        );
        return {
            cities: cityData,
            comparisonDate: new Date().toISOString()
        };
    }

    async getUVIndex(location: string): Promise<number> {
        const cachedLocation = this.locationCache.get(location);
        if (cachedLocation) {
            return this.weatherApi.getUVIndex(cachedLocation);
        }
        const locations = await this.searchLocation(location);
        if (locations.length === 0) {
            throw new Error(`Location not found: ${location}`);
        }
        this.locationCache.set(location, locations[0]);
        return this.weatherApi.getUVIndex(locations[0]);
    }

    async getPollenCount(location: string): Promise<PollenData> {
        const cachedLocation = this.locationCache.get(location);
        if (cachedLocation) {
            return this.weatherApi.getPollenCount(cachedLocation);
        }
        const locations = await this.searchLocation(location);
        if (locations.length === 0) {
            throw new Error(`Location not found: ${location}`);
        }
        this.locationCache.set(location, locations[0]);
        return this.weatherApi.getPollenCount(locations[0]);
    }

    async getAirQuality(location: string): Promise<AQI> {
        const cachedLocation = this.locationCache.get(location);
        if (cachedLocation) {
            return this.weatherApi.getAirQuality(cachedLocation);
        }
        const locations = await this.searchLocation(location);
        if (locations.length === 0) {
            throw new Error(`Location not found: ${location}`);
        }
        this.locationCache.set(location, locations[0]);
        return this.weatherApi.getAirQuality(locations[0]);
    }

    async getSunriseSunset(location: string, date: string): Promise<Times> {
        const cachedLocation = this.locationCache.get(location);
        if (cachedLocation) {
            return this.weatherApi.getSunriseSunset(cachedLocation, date);
        }
        const locations = await this.searchLocation(location);
        if (locations.length === 0) {
            throw new Error(`Location not found: ${location}`);
        }
        this.locationCache.set(location, locations[0]);
        return this.weatherApi.getSunriseSunset(locations[0], date);
    }

    async getMoonPhase(date: string): Promise<string> {
        return this.weatherApi.getMoonPhase(date);
    }

    async convertTemperature(value: number, from: Unit, to: Unit): Promise<number> {
        return this.weatherApi.convertTemperature(value, from, to);
    }
}
