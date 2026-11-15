import React from 'react';
export default function PostFlightArrival({ state }) {
  return (
    <div className="p-6 bg-[#1E293B] text-[#C5A880] border border-[#C5A880]/30 rounded-lg">
      <h2 className="text-lg font-serif">PostFlightArrival Stub (Waiting for ISDN Drop-In)</h2>
      <p className="text-xs text-slate-300 mt-2">Active Flight: {state?.flight?.flight_number || "CX251"}</p>
    </div>
  );
}
