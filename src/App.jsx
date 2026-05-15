import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';


import Login from './Login';
import Dashboard from './Dashboard';
import Vendors from './Vendors';
import Parts from './Parts';
import Schedule from './Schedule';
import Inspection from './Inspection'; 
import QCReport from './QCReport';
import Production from './Production';
import InspectionForm from './InspectionForm';
import NGHandling from './NGHandling';
import RecycleBin from './RecycleBin';


import InspectionList from './InspectionList'; 

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/vendors" element={<Vendors />} />
        <Route path="/parts" element={<Parts />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/inspection" element={<Inspection />} />
        <Route path="/inspection/:id" element={<InspectionForm />} />
        <Route path="/inspection-list" element={<InspectionList />} />
        <Route path="/ng-handling" element={<NGHandling />} />
        <Route path="/qc-report" element={<QCReport />} />
        <Route path="/production" element={<Production />} />
        <Route path="/recycle-bin" element={<RecycleBin />} />
      </Routes>
    </Router>
  );
}

export default App;