// Owl Airlines demo seed data.
// A single hardcoded customer represents every caller for the live demo.
// Flight numbers start with OA, reservation confirmation codes start with OWL.

const customer = {
  id: "cust_owl_001",
  name: "Avery Stone",
  phone_number: "+18102561500",
  loyalty_status: "Gold",
  preferences: { seat: "aisle", meal: "Vegetarian" },
};

const reservation = {
  confirmation_code: "OWL100",
  customer_id: customer.id,
  passenger_name: customer.name,
  phone_number: customer.phone_number,
  flight_number: "OA123",
  seat: "12C",
  status: "CONFIRMED",
  bag_status: "Loaded on the aircraft",
};

const trip = {
  id: "trip_owl_001",
  customer_id: customer.id,
  flight_number: reservation.flight_number,
  origin: "SFO",
  destination: "JFK",
  departure_time: "09:30",
  status: "on time",
};

export function getReservation() {
  return { reservation, trip };
}

export function getFlightStatus() {
  return {
    flight_number: trip.flight_number,
    origin: trip.origin,
    destination: trip.destination,
    departure_time: trip.departure_time,
    status: trip.status,
  };
}

export function getBagStatus() {
  return {
    confirmation_code: reservation.confirmation_code,
    bag_status: reservation.bag_status,
  };
}

export function getSeat() {
  return {
    confirmation_code: reservation.confirmation_code,
    flight_number: reservation.flight_number,
    seat: reservation.seat,
  };
}
