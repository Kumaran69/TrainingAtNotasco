import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Booking({ notify, onBooked }) {
  const [seats, setSeats] = useState([]);
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("");
  const [seatType, setSeatType] = useState("");
  const [lastTicket, setLastTicket] = useState(null);
  const [punching, setPunching] = useState(false);

  async function refresh() {
    setSeats(await api.getSeatAvailability());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleBook(e) {
    e.preventDefault();
    if (!seatType) {
      notify("Choose a seat type first.", "error");
      return;
    }
    try {
      const ticket = await api.bookTicket(name, destination, seatType);
      setLastTicket(ticket);
      setPunching(true);
      setTimeout(() => setPunching(false), 700);
      notify(`Ticket ${ticket.ticket_id} confirmed \u2014 seat ${ticket.seat_type.toUpperCase()} #${ticket.seat_number}`, "success");
      setName("");
      setDestination("");
      onBooked?.();
      await refresh();
    } catch (err) {
      notify(err.message, "error");
    }
  }

  return (
    <div className="booking">
      <section>
        <h3 className="section-title">Choose a seat class</h3>
        <div className="seat-grid">
          {seats.map((s) => (
            <button
              type="button"
              key={s.seat_type}
              className={`seat-card ${seatType === s.seat_type ? "seat-card--active" : ""} ${s.free_seats === 0 ? "seat-card--full" : ""}`}
              onClick={() => s.free_seats > 0 && setSeatType(s.seat_type)}
              disabled={s.free_seats === 0}
            >
              <span className="seat-card__type">{s.seat_type}</span>
              <span className="seat-card__price">\u20B9{s.price}</span>
              <span className="seat-card__avail">
                {s.free_seats === 0 ? "Fully booked" : `${s.free_seats} / ${s.total_seats} free`}
              </span>
            </button>
          ))}
        </div>
      </section>

      <div className="booking__layout">
        <form className="booking-form" onSubmit={handleBook}>
          <h3 className="section-title">Passenger details</h3>
          <label className="field">
            <span>Passenger name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Ananya Rao"
              required
            />
          </label>
          <label className="field">
            <span>Destination</span>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="e.g. Madurai"
              required
            />
          </label>
          <button className="btn btn--primary btn--full" type="submit">
            Book ticket
          </button>
        </form>

        <div className={`boarding-pass ${lastTicket ? "boarding-pass--visible" : ""} ${punching ? "boarding-pass--punch" : ""}`}>
          {lastTicket ? (
            <>
              <div className="boarding-pass__row">
                <span className="boarding-pass__label">Passenger</span>
                <span className="boarding-pass__value">{lastTicket.passenger_name}</span>
              </div>
              <div className="boarding-pass__row">
                <span className="boarding-pass__label">Destination</span>
                <span className="boarding-pass__value">{lastTicket.destination}</span>
              </div>
              <div className="ticket-perforation" aria-hidden="true" />
              <div className="boarding-pass__row">
                <span className="boarding-pass__label">Class</span>
                <span className="boarding-pass__value">{lastTicket.seat_type.toUpperCase()}</span>
              </div>
              <div className="boarding-pass__row">
                <span className="boarding-pass__label">Seat</span>
                <span className="boarding-pass__value">#{lastTicket.seat_number}</span>
              </div>
              <div className="boarding-pass__row">
                <span className="boarding-pass__label">Ticket ID</span>
                <span className="boarding-pass__value">{lastTicket.ticket_id}</span>
              </div>
              <div className="boarding-pass__punch" aria-hidden="true" />
            </>
          ) : (
            <p className="muted">Your confirmed ticket will appear here.</p>
          )}
        </div>
      </div>
    </div>
  );
}
