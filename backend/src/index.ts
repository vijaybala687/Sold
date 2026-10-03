console.log("🚀 SOLD Backend: Initializing...");

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server } from 'socket.io';
import Redis from 'ioredis';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const fastify = Fastify({ logger: false });

// 1. CORS for API
fastify.register(cors, { 
  origin: "http://localhost:3000" 
});

const prisma = new PrismaClient();
const redis = new Redis(process.env.REDIS_URL!);

// 2. CORS for Sockets
const io = new Server(fastify.server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

const IPL_TEAMS = ["CSK", "MI", "RCB", "KKR", "RR", "SRH", "GT", "LSG", "DC", "PBKS"];

// --- HELPERS ---

const getNextBid = (currentBid: number) => {
  if (currentBid < 100) return currentBid + 5;      
  if (currentBid < 500) return currentBid + 20;     
  return currentBid + 50;                           
};

const startNextPlayer = async (roomCode: string) => {
  const roomKey = `room:${roomCode}`;
  const processedKey = `room:${roomCode}:processed`;

  const auctionedIds = await redis.smembers(processedKey);
  const auctionedIdsAsInt = auctionedIds.map(id => parseInt(id));

  const player = await prisma.player.findFirst({
    where: { id: { notIn: auctionedIdsAsInt } }
  });

  if (!player) {
    io.to(roomCode).emit('auction_ended', { message: "All players auctioned!" });
    await redis.hset(roomKey, "status", "FINISHED");
    await redis.srem("active_rooms", roomCode);
    return;
  }

  await redis.sadd(processedKey, player.id.toString());
  await redis.hset(roomKey, {
    status: 'BIDDING',
    currentPlayerId: player.id.toString(),
    currentPlayerName: player.name,
    currentBid: player.basePriceLakhs.toString(),
    highestBidderId: "",
    timer: "15",
  });

  io.to(roomCode).emit('new_player', { player, currentBid: player.basePriceLakhs, timer: 15 });
  console.log(`[${roomCode}] Auctioning: ${player.name}`);
};

const finalizeSale = async (roomCode: string, state: any) => {
  const roomKey = `room:${roomCode}`;
  await redis.hset(roomKey, "status", "RESULT");

  if (state.highestBidderId && state.highestBidderId !== "") {
    try {
      const franchise = await prisma.franchise.upsert({
        where: { id: `${roomCode}_${state.highestBidderId}` },
        update: { purseRemaining: { decrement: parseInt(state.currentBid) } },
        create: {
          id: `${roomCode}_${state.highestBidderId}`,
          roomCode: roomCode,
          teamName: state.highestBidderId,
          purseRemaining: 12000 - parseInt(state.currentBid)
        }
      });

      await prisma.auctionResult.create({
        data: {
          playerId: parseInt(state.currentPlayerId),
          franchiseId: franchise.id,
          finalPrice: parseInt(state.currentBid)
        }
      });

      io.to(roomCode).emit('player_status', { 
        status: 'SOLD', winner: state.highestBidderId, price: state.currentBid 
      });
    } catch (err) { console.error("DB Error:", err); }
  } else {
    io.to(roomCode).emit('player_status', { status: 'UNSOLD' });
  }

  setTimeout(() => startNextPlayer(roomCode), 4000);
};

// --- SOCKET EVENT HANDLERS ---

io.on('connection', (socket) => {
  console.log('👤 Connected:', socket.id);

  socket.on('create_room', async () => {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    await redis.hset(`room:${roomCode}`, { status: "LOBBY", head: socket.id });
    await redis.sadd("active_rooms", roomCode);
    socket.emit('room_created', roomCode);
  });

  socket.on('join_room', async (roomCode: string) => {
    socket.join(roomCode);
    const room = await redis.hgetall(`room:${roomCode}`);
    const taken = await redis.smembers(`room:${roomCode}:teams_taken`);
    socket.emit('lobby_update', { allTeams: IPL_TEAMS, teamsTaken: taken, status: room.status });
  });

  // 3. Team Selection (Switching supported)
  socket.on('select_team', async ({ roomCode, teamName }: { roomCode: string, teamName: string }) => {
    const lockKey = `room:${roomCode}:teams_taken`;
    const userKey = `user:${socket.id}:team`; // Temporary key to remember THIS user's team

    // Check if the team is taken by SOMEONE ELSE
    const isTaken = await redis.sismember(lockKey, teamName);
    if (isTaken) {
      socket.emit('error', 'Team already taken by another owner!');
      return;
    }

    // 1. Check if this user already had a team
    const oldTeam = await redis.get(userKey);
    if (oldTeam) {
      // Release the old team so others can pick it
      await redis.srem(lockKey, oldTeam);
    }

    // 2. Claim the new team
    await redis.sadd(lockKey, teamName);
    await redis.set(userKey, teamName, 'EX', 3600); // Remember choice for 1 hour

    // 3. Broadcast the update to everyone
    const taken = await redis.smembers(lockKey);
    io.to(roomCode).emit('lobby_update', { teamsTaken: taken });
    socket.emit('team_confirmed', teamName);
    
    console.log(`[LOBBY] ${socket.id} switched from ${oldTeam || 'none'} to ${teamName}`);
  });

  socket.on('start_auction', async (roomCode: string) => {
    const room = await redis.hgetall(`room:${roomCode}`);
    if (room.head === socket.id) {
      await redis.hset(`room:${roomCode}`, "status", "BIDDING");
      await startNextPlayer(roomCode);
    }
  });

  socket.on('place_bid', async ({ roomCode, teamName }: { roomCode: string, teamName: string }) => {
    const roomKey = `room:${roomCode}`;
    const state = await redis.hgetall(roomKey);

    if (state.status !== 'BIDDING' || state.highestBidderId === teamName) return;

    const nextBid = getNextBid(parseInt(state.currentBid));
    
    await redis.hset(roomKey, {
      currentBid: nextBid.toString(),
      highestBidderId: teamName,
      timer: "10" 
    });

    io.to(roomCode).emit('bid_update', { currentBid: nextBid, highestBidderId: teamName, timer: 10 });
  });

  socket.on('disconnect', () => console.log('👤 Disconnected'));
});

// --- API ROUTES ---
fastify.get('/api/squad/:teamName/:roomCode', async (request, reply) => {
  const { teamName, roomCode } = request.params as any;
  const squad = await prisma.auctionResult.findMany({
    where: { 
      franchise: { teamName: teamName, roomCode: roomCode } 
    },
    include: { player: true }
  });
  return squad;
});

// --- THE GLOBAL REFEREE LOOP ---

const startGlobalTimer = () => {
  setInterval(async () => {
    const activeRooms = await redis.smembers("active_rooms");
    
    for (const roomCode of activeRooms) {
      const roomKey = `room:${roomCode}`;
      const state = await redis.hgetall(roomKey);
      
      if (state.status === 'BIDDING') {
        let timeLeft = parseInt(state.timer || "0");
        if (timeLeft > 0) {
          timeLeft -= 1;
          await redis.hset(roomKey, "timer", timeLeft.toString());
          io.to(roomCode).emit('timer_tick', { timer: timeLeft });
        } else {
          await finalizeSale(roomCode, state);
        }
      }
    }
  }, 1000);
};

// --- START SERVER ---

const start = async () => {
  try {
    await redis.ping();
    console.log("✅ Redis Connected");
    startGlobalTimer();
    await fastify.listen({ port: 8080, host: '0.0.0.0' });
    console.log(`✅ SOLD Backend Live on Port 8080`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();