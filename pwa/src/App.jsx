import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [produkty, setProdukty] = useState([])

  // Pobieranie produktów z API Django
  useEffect(() => {
    axios.get('http://127.0.0.1:8000/api/products/')
      .then(res => setProdukty(res.data))
      .catch(err => console.error("Błąd połączenia z API:", err))
  }, [])

  // Funkcja określająca kolor na podstawie Twoich wymagań
  const getStatusClass = (p) => {
    // Czerwony: kończy się data (np. za 2 dni) lub brak sztuk
    if (p.quantity <= 0) return 'status-red'
    // Żółty: mało sztuk (np. 1-2 sztuki)
    if (p.quantity <= 2) return 'status-yellow'
    // Zielony: OK
    return 'status-green'
  }

  return (
    <div className="App">
      <header>
        <h1>🏠 Domowy Inwentarz</h1>
      </header>

      <main className="product-list">
        {produkty.length === 0 ? (
          <p>Brak produktów w bazie. Dodaj coś w panelu admina!</p>
        ) : (
          produkty.map(p => (
            <div key={p.id} className={`product-card ${getStatusClass(p)}`}>
              <div className="product-info">
                <h2>{p.name}</h2>
                <p><strong>Ilość:</strong> {p.quantity} {p.unit}</p>
                <p><strong>Miejsce:</strong> {p.location}</p>
              </div>
              <div className="product-meta">
                <span>📅 Ważne do: {p.expiry_date}</span>
                <span className="category-tag">{p.category}</span>
              </div>
            </div>
          ))
        )}
      </main>
    </div>
  )
}

export default App