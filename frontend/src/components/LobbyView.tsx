export default function LobbyView({ roomCode, myTeam, isHead }: any) {
  const [teams, setTeams] = useState<string[]>([]);
  const [taken, setTaken] = useState<string[]>([]);

  useEffect(() => {
    socket.on("lobby_update", (data) => {
      setTeams(data.allTeams);
      setTaken(data.teamsTaken);
    });
  }, []);

  return (
    <div className="p-6 flex flex-col h-full">
      <h1 className="text-2xl font-black italic">ROOM: {roomCode}</h1>
      <p className="text-gray-400 text-sm mb-6">Select your Franchise</p>
      
      <div className="grid grid-cols-2 gap-4">
        {teams.map(team => (
          <button 
            key={team}
            disabled={taken.includes(team) || myTeam !== ""}
            onClick={() => socket.emit("select_team", { roomCode, teamName: team })}
            className={`p-4 rounded-xl font-bold border-2 ${myTeam === team ? 'border-blue-500 bg-blue-500/20' : taken.includes(team) ? 'opacity-30 border-gray-700' : 'border-white/10'}`}
          >
            {team}
          </button>
        ))}
      </div>

      {isHead && myTeam && (
        <button 
          onClick={() => socket.emit("start_auction_request", roomCode)}
          className="mt-auto bg-green-600 p-4 rounded-2xl font-black italic"
        >
          START AUCTION
        </button>
      )}
    </div>
  );
}