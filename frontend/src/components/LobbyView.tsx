"use client";

import { useState, useEffect } from "react"; // Fixes 'useState' and 'useEffect' errors
import { socket } from "@/lib/socket";       // Fixes 'socket' errors

interface LobbyProps {
  roomCode: string;
  myTeam: string;
  isHead: boolean;
}

export default function LobbyView({ roomCode, myTeam, isHead }: LobbyProps) {
  const [teams, setTeams] = useState<string[]>([]);
  const [taken, setTaken] = useState<string[]>([]);

  useEffect(() => {
    // Sync the lobby data from the server
    socket.on("lobby_update", (data: { allTeams?: string[], teamsTaken?: string[] }) => {
      if (data.allTeams) setTeams(data.allTeams);
      if (data.teamsTaken) setTaken(data.teamsTaken);
    });

    return () => {
      socket.off("lobby_update");
    };
  }, []);

  return (
    <div className="p-6 flex flex-col h-full bg-[#0B0E14]">
      <div className="mb-8">
        <h1 className="text-4xl font-black italic tracking-tighter uppercase">The Lobby</h1>
        <p className="text-blue-500 font-bold">ROOM CODE: {roomCode}</p>
      </div>
      
      <p className="text-gray-400 text-sm mb-4 font-bold uppercase tracking-widest">
        Select your Franchise
      </p>
      
      <div className="grid grid-cols-2 gap-4 overflow-y-auto pr-2">
        {teams.map((team: string) => (
          <button 
            key={team}
            disabled={taken.includes(team) || myTeam !== ""}
            onClick={() => socket.emit("select_team", { roomCode, teamName: team })}
            className={`p-6 rounded-2xl border-2 transition-all font-black italic text-xl ${
              myTeam === team 
                ? 'border-blue-500 bg-blue-500/20 text-blue-500' 
                : taken.includes(team) 
                ? 'opacity-20 border-transparent bg-white/5 grayscale' 
                : 'border-white/5 bg-white/5 active:scale-95'
            }`}
          >
            {team}
          </button>
        ))}
      </div>

      <div className="mt-auto pt-6">
        {isHead && (
          <button 
            disabled={!myTeam}
            onClick={() => socket.emit("start_auction", roomCode)}
            className={`w-full py-5 rounded-2xl font-black italic text-2xl transition-all ${
              myTeam ? 'bg-green-600 text-white shadow-lg shadow-green-900/20' : 'bg-gray-800 text-gray-600'
            }`}
          >
            {myTeam ? "IGNITE AUCTION" : "PICK A TEAM FIRST"}
          </button>
        )}
        {!isHead && (
            <p className="text-center text-gray-500 font-bold animate-pulse uppercase tracking-tighter">
                Waiting for host to start...
            </p>
        )}
      </div>
    </div>
  );
}