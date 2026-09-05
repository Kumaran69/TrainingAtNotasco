import { useEffect, useState, useCallback } from "react";
import { api } from "../api.js";

export default function Tickets({ notify, refreshKey }) {
  const [tickets, setTickets] = useState([]);

  const refresh = useCallback(async () => {
    setTickets(await api.listTickets());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, refreshKey]);

  async function handleCancel(ticketId) {
    try {
      await api.cancelTicket(ticketId);
      notify(`Ticket ${ticketId} cancelled.`, "success");
      await refresh();
    } catch (err) {
      notify(err.message, "error");
    }
  }

  return (
    <section className="tickets">
      <h3 className="section-title">Booked tickets</h3>
      {tickets.length === 0 ? (
        <p className="muted">No active tickets yet.</p>
      ) : (
        <ul className="ticket-list">
          {tickets.map((t) => (
            <li className="ticket-row" key={t.ticket_id}>
              <div>
                <div className="ticket-row__id">{t.ticket_id}</div>
                <div className="ticket-row__meta">
                  {t.passenger_name} &middot; {t.destination} &middot; {t.seat_type.toUpperCase()} #{t.seat_number}
                </div>
              </div>
              <button className="btn btn--ghost btn--small" onClick={() => handleCancel(t.ticket_id)}>
                Cancel
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
