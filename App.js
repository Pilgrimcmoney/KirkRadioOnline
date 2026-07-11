import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import DJApp from "./pages/DJApp";

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<DJApp />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
