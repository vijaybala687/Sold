"use client";

import { useEffect, useState } from "react";
import { socket } from "@/lib/socket";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Users, Zap, Globe, Plus, LogIn, CheckCircle2 } from "lucide-react";



export default function SoldApp() {
  // --- APP STATE ---
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<"LANDING" | "LOBBY" | "ARENA" | "RESULTS">("LANDING");
  const [roomCode, setRoomCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [myTeam, setMyTeam] = useState("");
  const [isHead, setIsHead] = useState(false);
  const [lobbyTeams, setLobbyTeams] = useState<string[]>([]);
  const [takenTeams, setTakenTeams] = useState<string[]>([]);
  
  
  // --- ARENA STATE ---
  const [player, setPlayer] = useState<any>(null);
  const [timer, setTimer] = useState(0);
  const [currentBid, setCurrentBid] = useState(0);
  const [highestBidder, setHighestBidder] = useState("");
  const [arenaStatus, setArenaStatus] = useState("BIDDING");

  useEffect(() => {
    setMounted(true);

    socket.on("connect", () => console.log("Connected to Backend ✅"));

    socket.on("room_created", (code) => {
      console.log("Room Created:", code);
      setRoomCode(code);
      setIsHead(true);
      setView("LOBBY");
      socket.emit("join_room", code);
    });

    socket.on("lobby_update", (data) => {
      if (data.allTeams) setLobbyTeams(data.allTeams);
      if (data.teamsTaken) setTakenTeams(data.teamsTaken);
      if (data.status === "BIDDING") setView("ARENA");
    });

    socket.on("team_confirmed", (team) => {
      setMyTeam(team);
    });

    socket.on("new_player", (data) => {
      setPlayer(data.player);
      setCurrentBid(data.currentBid);
      setTimer(data.timer);
      setHighestBidder("");
      setArenaStatus("BIDDING");
      setView("ARENA");
    });

    socket.on("timer_tick", (data) => setTimer(data.timer));
    socket.on("bid_update", (data) => {
      setCurrentBid(data.currentBid);
      setHighestBidder(data.highestBidderId);
    });
    socket.on("player_status", (data) => setArenaStatus(data.status));
    socket.on("auction_ended", () => setView("RESULTS"));

    return () => {
      socket.off("room_created");
      socket.off("lobby_update");
      socket.off("team_confirmed");
      socket.off("new_player");
    };
  }, []);

  if (!mounted) return null; 

  // --- HANDLERS ---
  const handleCreate = () => socket.emit("create_room");
  const handleJoin = () => {
    if (!inputCode) return;
    setRoomCode(inputCode.toUpperCase());
    setView("LOBBY");
    socket.emit("join_room", inputCode.toUpperCase());
  };
  const handleSelectTeam = (team: string) => socket.emit("select_team", { roomCode, teamName: team });
  const handleStart = () => socket.emit("start_auction", roomCode);
  const handleBid = () => socket.emit("place_bid", { roomCode, teamName: myTeam });

  return (
    <main className="h-screen w-full bg-[#0B0E14] text-white overflow-hidden font-sans">
      <AnimatePresence mode="wait">
        
        {/* VIEW: LANDING */}
        {view === "LANDING" && (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center p-10 space-y-10">
            <h1 className="text-7xl font-black italic text-blue-600 tracking-tighter">SOLD</h1>
            <div className="w-full max-w-xs space-y-4">
              <button onClick={handleCreate} className="w-full bg-blue-600 py-4 rounded-2xl font-black text-xl italic flex items-center justify-center gap-2">
                <Plus /> CREATE ARENA
              </button>
              <div className="flex items-center gap-4 py-2">
                <div className="h-[1px] bg-white/10 flex-1"></div>
                <span className="text-gray-600 text-xs font-bold">OR</span>
                <div className="h-[1px] bg-white/10 flex-1"></div>
              </div>
              <input 
                className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-center font-bold"
                placeholder="6-DIGIT CODE"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
              />
              <button onClick={handleJoin} className="w-full bg-white text-black py-4 rounded-2xl font-black text-xl italic">
                JOIN ARENA
              </button>
            </div>
          </motion.div>
        )}

        {/* VIEW: LOBBY */}
        {view === "LOBBY" && (
          <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col p-6">
            <h2 className="text-2xl font-black italic">ROOM: {roomCode}</h2>
            <p className="text-blue-500 font-bold mb-6">Select your Franchise</p>
            
            <div className="grid grid-cols-2 gap-3 overflow-y-auto pr-2">
              {lobbyTeams.map(team => (
                <button 
                  key={team}
                  disabled={takenTeams.includes(team) || myTeam !== team}
                  onClick={() => handleSelectTeam(team)}
                  className={`p-6 rounded-2xl border-2 transition-all ${
                    myTeam === team ? 'border-blue-500 bg-blue-500/20' : 
                    takenTeams.includes(team) ? 'opacity-20 border-transparent bg-white/5' : 'border-white/5 bg-white/5'
                  }`}
                >
                  <span className="text-xl font-black">{team}</span>
                </button>
              ))}
            </div>

            {isHead && myTeam && (
              <button onClick={handleStart} className="mt-auto bg-green-600 py-5 rounded-2xl font-black text-2xl italic">
                START AUCTION
              </button>
            )}
          </motion.div>
        )}

        {/* VIEW: ARENA */}
        {view === "ARENA" && (
          <motion.div key="arena" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col p-4">
             {/* Simple Arena HUD */}
             <div className="flex justify-between p-4 bg-white/5 rounded-2xl">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold">PURSE</p>
                  <p className="text-xl font-black text-green-400">₹120.00 Cr</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 font-bold">{myTeam}</p>
                  <p className="text-xl font-black text-blue-400">0/25</p>
                </div>
             </div>

             {/* Player Card */}
             <div className="flex-1 flex flex-col items-center justify-center relative">
                {player && (
                  <div className="text-center">
                    <img src={player.imageUrl} className="w-48 h-48 mx-auto drop-shadow-2xl" />
                    <h3 className="text-4xl font-black uppercase italic mt-4">{player.name}</h3>
                    <p className="text-gray-500 font-bold tracking-widest">{player.category} | {player.nationality}</p>
                  </div>
                )}
                <div className="absolute top-0 right-0 p-4">
                  <p className="text-5xl font-black italic">{timer}s</p>
                </div>
                {arenaStatus === "SOLD" && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><h1 className="text-7xl font-black text-red-500 -rotate-12 border-8 border-red-500 px-4">SOLD</h1></div>}
             </div>

             <div className="pb-10 space-y-4">
                <div className="flex justify-between items-end">
                  <p className="text-4xl font-black italic">₹{currentBid}L</p>
                  <p className="text-blue-400 font-black uppercase">{highestBidder || "No Bids"}</p>
                </div>
                <button 
                  onClick={handleBid}
                  disabled={arenaStatus !== "BIDDING" || highestBidder === myTeam}
                  className="w-full bg-blue-600 py-6 rounded-3xl font-black text-2xl italic shadow-xl shadow-blue-600/20"
                >
                  {highestBidder === myTeam ? "YOU LEAD" : `BID ₹${currentBid + 5}L`}
                </button>
             </div>
          </motion.div>
        )}

      </AnimatePresence>
    </main>
  );
}