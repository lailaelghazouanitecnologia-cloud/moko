import { BaseAgent } from '../core/base-agent';
import { BookingAPI } from './booking-api';
import { Flight, Passenger, Booking, FlightStatus, BoardingPass, Baggage, MealOption, Service } from './types';

export class AirlineAgent extends BaseAgent {
    private bookingApi: BookingAPI;
    private flightCache: Map<string, Flight>;

    constructor() {
        super();
        this.bookingApi = new BookingAPI();
        this.flightCache = new Map();
    }

    async searchFlights(origin: string, destination: string, date: string): Promise<Flight[]> {
        const cacheKey = `${origin}-${destination}-${date}`;
        
        if (this.flightCache.has(cacheKey)) {
            return [this.flightCache.get(cacheKey)!];
        }

        const flights = await this.bookingApi.searchFlights(origin, destination, date);
        
        flights.forEach(flight => {
            const key = `${flight.origin}-${flight.destination}-${flight.departureTime.split('T')[0]}`;
            this.flightCache.set(key, flight);
        });

        return flights;
    }

    async bookFlight(flightId: string, passenger: Passenger): Promise<Booking> {
        return await this.bookingApi.reserveSeat(flightId, passenger);
    }

    async cancelBooking(bookingId: string): Promise<boolean> {
        return await this.bookingApi.cancelReservation(bookingId);
    }

    async getBookingDetails(bookingId: string): Promise<Booking> {
        return await this.bookingApi.getBooking(bookingId);
    }

    async upgradeSeat(bookingId: string, newClass: string): Promise<boolean> {
        const booking = await this.getBookingDetails(bookingId);
        const flight = await this.bookingApi.getFlight(booking.flightId);
        
        const availableSeats = await this.bookingApi.checkSeatAvailability(flight.id, newClass);
        if (availableSeats.length === 0) {
            return false;
        }

        return await this.bookingApi.upgradeSeat(bookingId, newClass);
    }

    async checkIn(bookingId: string): Promise<BoardingPass> {
        const booking = await this.getBookingDetails(bookingId);
        return await this.bookingApi.generateBoardingPass(booking);
    }

    async getFlightStatus(flightNumber: string): Promise<FlightStatus> {
        return await this.bookingApi.getFlightStatus(flightNumber);
    }

    async rebookFlight(bookingId: string, newFlightId: string): Promise<Booking> {
        const oldBooking = await this.getBookingDetails(bookingId);
        await this.cancelBooking(bookingId);
        
        const newBooking = await this.bookFlight(newFlightId, oldBooking.passenger);
        return newBooking;
    }

    async addBaggage(bookingId: string, bags: Baggage[]): Promise<number> {
        const booking = await this.getBookingDetails(bookingId);
        const flight = await this.bookingApi.getFlight(booking.flightId);
        
        let totalFee = 0;
        for (const bag of bags) {
            const fee = await this.bookingApi.calculateBaggageFee(flight.id, bag);
            totalFee += fee;
        }
        
        await this.bookingApi.addBaggage(bookingId, bags);
        return totalFee;
    }

    async selectSeat(bookingId: string, seatNumber: string): Promise<boolean> {
        const booking = await this.getBookingDetails(bookingId);
        const seatMap = await this.bookingApi.getSeatMap(booking.flightId);
        
        const seat = seatMap.find(s => s.number === seatNumber);
        if (!seat || seat.occupied) {
            return false;
        }

        return await this.bookingApi.assignSeat(bookingId, seatNumber);
    }

    async getMealOptions(flightId: string): Promise<MealOption[]> {
        return await this.bookingApi.getAvailableMeals(flightId);
    }

    async setMealPreference(bookingId: string, mealCode: string): Promise<boolean> {
        const booking = await this.getBookingDetails(bookingId);
        const mealOptions = await this.getMealOptions(booking.flightId);
        
        const meal = mealOptions.find(m => m.code === mealCode);
        if (!meal) {
            return false;
        }

        return await this.bookingApi.updateMealPreference(bookingId, mealCode);
    }

    async getSpecialServices(flightId: string): Promise<Service[]> {
        return await this.bookingApi.getAvailableServices(flightId);
    }

    async requestSpecialService(bookingId: string, serviceCode: string): Promise<boolean> {
        const booking = await this.getBookingDetails(bookingId);
        const services = await this.getSpecialServices(booking.flightId);
        
        const service = services.find(s => s.code === serviceCode);
        if (!service) {
            return false;
        }

        return await this.bookingApi.addSpecialService(bookingId, serviceCode);
    }

    async getLoyaltyPoints(customerId: string): Promise<number> {
        return await this.bookingApi.getLoyaltyBalance(customerId);
    }
}
