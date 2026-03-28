import { useEffect, useState } from "react";

export default function App() {
  const [status, setStatus] = useState("Инициализация...");

  useEffect(() => {
    try {
      const tg = window.Telegram?.WebApp;

      if (tg) {
        tg.ready();
        tg.expand();
        setStatus(`Mini App открыт. Платформа: ${tg.platform || "unknown"}`);
      } else {
        setStatus("Telegram WebApp объект не найден");
      }
    } catch (error) {
      setStatus(`Ошибка: ${error.message}`);
    }
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#111",
        color: "#fff",
        fontFamily: "Arial, sans-serif",
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <h1 style={{ marginTop: 0 }}>TBF TEST</h1>
      <p>{status}</p>
      <p>Если ты видишь этот экран внутри Telegram, значит Mini App работает.</p>
    </div>
  );
}
