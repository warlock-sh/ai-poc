import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import PipelineList from './pages/PipelineList';
import PipelineDetail from './pages/PipelineDetail';
import PipelineCreator from './pages/PipelineCreator';

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<PipelineList />} />
        <Route path="/pipelines/:id" element={<PipelineDetail />} />
        <Route path="/create" element={<PipelineCreator />} />
      </Routes>
    </Router>
  );
}

export default App;
