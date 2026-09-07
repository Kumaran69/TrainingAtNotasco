import { useEffect, useState, useCallback } from "react";
import { api } from "../api.js";

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function Expenses({ notify }) {
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [filter, setFilter] = useState("");

  const refresh = useCallback(async (categoryFilter) => {
    const [list, sum] = await Promise.all([
      api.getExpenses(categoryFilter || undefined),
      api.getExpenseSummary(),
    ]);
    setExpenses(list);
    setSummary(sum);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleAdd(e) {
    e.preventDefault();
    const numericAmount = parseFloat(amount);
    if (!category.trim()) return notify("Enter a category.", "error");
    if (Number.isNaN(numericAmount) || numericAmount <= 0) return notify("Enter a valid amount.", "error");
    if (!date) return notify("Enter a date.", "error");

    try {
      await api.addExpense(category.trim(), numericAmount, date);
      notify(`Added ${category.trim()} - \u20B9${numericAmount.toFixed(2)}`, "success");
      setCategory("");
      setAmount("");
      await refresh(filter);
    } catch (err) {
      notify(err.message, "error");
    }
  }

  async function handleFilter(e) {
    e.preventDefault();
    await refresh(filter);
  }

  const categories = summary ? Object.keys(summary.by_category) : [];

  return (
    <div className="two-col">
      <section>
        <h3 className="section-title">Log an expense</h3>
        <form className="card" onSubmit={handleAdd}>
          <label className="field">
            <span>Category</span>
            <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Food, Travel, Books\u2026" />
          </label>
          <label className="field">
            <span>Amount</span>
            <input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </label>
          <label className="field">
            <span>Date</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <button className="btn btn--primary btn--full" type="submit">Add expense</button>
        </form>

        {summary && (
          <div className="card summary-card">
            <div className="summary-card__total">
              <span>Total spent</span>
              <strong>\u20B9{summary.total.toFixed(2)}</strong>
            </div>
            {categories.length > 0 && (
              <ul className="breakdown-list">
                {categories.map((c) => (
                  <li key={c}>
                    <span>{c}</span>
                    <span>\u20B9{summary.by_category[c].toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section>
        <h3 className="section-title">All expenses</h3>
        <form className="filter-row" onSubmit={handleFilter}>
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by category\u2026"
          />
          <button className="btn btn--ghost btn--small" type="submit">Filter</button>
          {filter && (
            <button
              type="button"
              className="btn btn--ghost btn--small"
              onClick={() => { setFilter(""); refresh(""); }}
            >
              Clear
            </button>
          )}
        </form>

        {expenses.length === 0 ? (
          <p className="muted">No expenses match yet.</p>
        ) : (
          <ul className="record-list">
            {expenses.map((e) => (
              <li key={e.id} className="record-row">
                <span className="record-row__primary">{e.category}</span>
                <span className="record-row__meta">{e.date}</span>
                <span className="record-row__amount">\u20B9{e.amount.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
