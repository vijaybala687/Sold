"use client";

import { useEffect, useState } from "react";
import { socket } from "@/lib/socket";
import { motion, AnimatePresence } from "framer-motion";
import { Wallet, Users, Zap, Globe, Plus, LogIn, CheckCircle2 } from "lucide-react";

export default function SoldApp() {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<"LANDING" | "LOBBY" | "ARENA" | "RESULTS">("LANDING");
  const [roomCode, setRoomCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [myTeam, setMyTeam] = useState("");
  const [isHead, setIsHead] = useState(false);
  const [lobbyTeams, setLobbyTeams] = useState<string[]>([]);
  const [takenTeams, setTakenTeams] = useState<string[]>([]);
  
  const [player, setPlayer] = useState<any>(null);
  const [timer, setTimer] = useState(0);
  const [currentBid, setCurrentBid] = useState(0);
  const [highestBidder, setHighestBidder] = useState("");
  const [arenaStatus, setArenaStatus] = useState("BIDDING");

  useEffect(() => {
    setMounted(true);
    socket.on("connect", () => console.log("Connected to Backend ✅"));

    socket.on("room_created", (code) => {
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
      setTimer(10); 
    });
    socket.on("player_status", (data) => setArenaStatus(data.status));
    socket.on("auction_ended", () => setView("RESULTS"));

    return () => {
      socket.off("room_created");
      socket.off("lobby_update");
      socket.off("team_confirmed");
      socket.off("new_player");
      socket.off("bid_update");
      socket.off("timer_tick");
    };
  }, []);

  if (!mounted) return null; 

  const getNextBidDisplay = (current: number) => {
    if (current < 100) return current + 5;
    if (current < 500) return current + 20;
    return current + 50;
  };

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
        
        {view === "LANDING" && (
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col items-center justify-center p-10 space-y-10">
            <h1 className="text-8xl font-black italic text-blue-600 tracking-tighter drop-shadow-[0_0_15px_rgba(37,99,235,0.4)]">SOLD</h1>
            <div className="w-full max-w-xs space-y-4">
              <button onClick={handleCreate} className="w-full bg-blue-600 py-4 rounded-2xl font-black text-xl italic flex items-center justify-center gap-2 active:scale-95 transition-all">
                <Plus /> CREATE ARENA
              </button>
              <div className="flex items-center gap-4 py-2"><div className="h-[1px] bg-white/10 flex-1"></div><span className="text-gray-600 text-xs font-bold">OR</span><div className="h-[1px] bg-white/10 flex-1"></div></div>
              <input className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-center font-bold uppercase focus:border-blue-500 outline-none" placeholder="6-DIGIT CODE" value={inputCode} onChange={(e) => setInputCode(e.target.value)} />
              <button onClick={handleJoin} className="w-full bg-white text-black py-4 rounded-2xl font-black text-xl italic active:scale-95 transition-all">JOIN ARENA</button>
            </div>
          </motion.div>
        )}

        {view === "LOBBY" && (
          <motion.div key="lobby" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col p-6">
            <h2 className="text-3xl font-black italic uppercase">Lobby: <span className="text-blue-500">{roomCode}</span></h2>
            <p className="text-gray-500 font-bold mb-6 text-xs uppercase tracking-widest">Select your Franchise</p>
            <div className="grid grid-cols-2 gap-3 overflow-y-auto pr-2">
              {lobbyTeams.map(team => (
                <button 
                  key={team}
                  disabled={takenTeams.includes(team) && myTeam !== team}
                  onClick={() => handleSelectTeam(team)}
                  className={`p-6 rounded-2xl border-2 transition-all font-black italic text-xl ${
                    myTeam === team ? 'border-blue-500 bg-blue-500/20 text-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 
                    takenTeams.includes(team) ? 'opacity-20 border-transparent bg-white/5 grayscale' : 'border-white/5 bg-white/5 active:scale-95'
                  }`}
                >
                  {team}
                </button>
              ))}
            </div>
            {isHead && (
              <button onClick={handleStart} disabled={!myTeam} className={`mt-auto py-5 rounded-2xl font-black text-2xl italic transition-all ${myTeam ? 'bg-green-600 shadow-[0_0_20px_rgba(22,163,74,0.3)]' : 'bg-gray-800 text-gray-500'}`}>
                {myTeam ? "IGNITE AUCTION" : "PICK A TEAM"}
              </button>
            )}
          </motion.div>
        )}

        {view === "ARENA" && (
          <motion.div key="arena" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col p-4">
             <div className="flex justify-between p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-md">
                <div><p className="text-[10px] text-gray-500 font-bold uppercase">Purse</p><p className="text-xl font-black text-green-400">₹120.00 Cr</p></div>
                <div className="text-right"><p className="text-[10px] text-gray-500 font-bold uppercase">{myTeam}</p><p className="text-xl font-black text-blue-400">0/25</p></div>
             </div>
             <div className="flex-1 flex flex-col items-center justify-center relative">
                <AnimatePresence mode="wait">
                  {player && (
                    <motion.div key={player.id} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-center relative">
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-blue-600 px-3 py-1 rounded-full text-[10px] font-black uppercase">{player.category}</div>
                      <img src={player.imageUrl} className="w-56 h-56 mx-auto drop-shadow-[0_20px_50px_rgba(59,130,246,0.3)] object-contain" />
                      <h3 className="text-4xl font-black uppercase italic mt-6 tracking-tighter">{player.name}</h3>
                      <p className="text-gray-500 font-bold tracking-widest text-xs mt-1">{player.nationality}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="absolute top-0 right-0 p-4">
                  <motion.p key={timer} initial={{ scale: 1.2 }} animate={{ scale: 1 }} className={`text-6xl font-black italic ${timer < 5 ? 'text-red-500' : 'text-white'}`}>{timer}s</motion.p>
                </div>
                {arenaStatus === "SOLD" && (
                  <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <h1 className="text-7xl font-black text-red-500 -rotate-12 border-8 border-red-500 px-6 py-2 uppercase shadow-2xl">Sold</h1>
                  </motion.div>
                )}
             </div>
             <div className="pb-10 space-y-4">
                <div className="flex justify-between items-end px-2">
                  <div><p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Current Bid</p><p className="text-5xl font-black italic tracking-tighter">₹{currentBid}L</p></div>
                  <div className="text-right"><p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Highest</p><p className="text-xl font-black text-blue-400 uppercase italic">{highestBidder || "NO BIDS"}</p></div>
                </div>
                <button onClick={handleBid} disabled={arenaStatus !== "BIDDING" || highestBidder === myTeam} 
                  className={`w-full py-6 rounded-3xl font-black text-3xl italic transition-all transform active:scale-95 ${
                    highestBidder === myTeam ? 'bg-gray-800 text-blue-500 border-2 border-blue-500/30' : 'bg-blue-600 text-white shadow-xl shadow-blue-900/40'
                  }`}>
                  {highestBidder === myTeam ? "YOU LEAD" : `BID ₹${getNextBidDisplay(currentBid)}L`}
                </button>
             </div>
          </motion.div>
        )}

      </AnimatePresence>
    </main>
  );
}