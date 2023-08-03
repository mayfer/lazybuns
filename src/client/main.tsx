import { useEffect, useState } from 'react';
import Clock from 'react-clock';
import { createRoot } from 'react-dom/client';
import 'react-clock/dist/Clock.css';

function MyApp() {
  const [value, setValue] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setValue(new Date()), 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return (
    <div>
      <Clock value={value} />
    </div>
  );
}

export default function start() {
  const container = document.getElementById('root');
  const root = createRoot(container); // createRoot(container!) if you use TypeScript
  root.render(<MyApp />);
};