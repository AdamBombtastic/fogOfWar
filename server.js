/*
  TODO: Add selective visibility interface for the DM
        Online-Offline indicators for players.
        Maybe, eventually do character select.
*/

const EVENT_TYPES = {
  create_room : "create_room",
  join_room : "join_room",
  move_player : "move_player",
  room_update : "room_update",
  ping_map : "ping_map",
  update_visibility : "update_visibility"
}

const express= require('express')
const sqlite=require('sqlite3').verbose();
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var DEBUG = true;

const PORT = 8000;

/** 
 * 
 * Serve the files 
 * 
 */
app.use(express.static(__dirname+'/'));

/** 
 * 
 * Set-up the DB 
 * 
 */
var db = new sqlite.Database("./db/database.db",sqlite.OPEN_READWRITE | sqlite.OPEN_CREATE, (err) => {
  if (err) {console.log("Error:" + err.message);}
  else console.log("Database. . . Connected!");
});

var roomTableSQL = "CREATE TABLE IF NOT EXISTS Room " +
"(id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT, isActive INTEGER NOT NULL DEFAULT 1)";

var playerTableSQL = "CREATE TABLE IF NOT EXISTS Player " +
"(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, room INTEGER, x INTEGER NOT NULL DEFAULT 0, y INTEGER NOT NULL DEFAULT 0, bIsOwner INTEGER DEFAULT 0, playerClass INTEGER DEFAULT 0, bIsOnline INTEGER DEFAULT 0)";

var visibilityTableSQL = "CREATE TABLE IF NOT EXISTS Visibility" + 
"(id INTEGER PRIMARY KEY AUTOINCREMENT, viewerId INTEGER NOT NULL, playerId INTEGER NOT NULL, bIsVisible INTEGER NOT NULL DEFAULT 0)"

//TODO: REFACTOR THIS
function createTable(tableSQL,tableName) {
db.run(tableSQL,(err) => {
if (!err) {
console.log(tableName + " table created");
}
else console.log(err);
});
}

createTable(roomTableSQL,"Room");
createTable(playerTableSQL,"Player");
createTable(visibilityTableSQL,"Visibility");


//#region SQL UTILITY
function query(sql) {
  return new Promise(resolve => {
   db.all(sql,[],(err,rows)=>{
       if (err) {
           console.log(err.message);
           resolve(null);
       }
       else {
           resolve(rows);
       }
   });
});
}
function insert(sql) {
 return new Promise(resolve => {
     db.run(sql, (err) => {
       if(!err) {
         resolve(true);
       }
       else {
         resolve(false);
         console.log(err);
       }
   });
 }); 
}
function insertSqlFromObject(tablename,obj) {
  var returnSQL = "INSERT INTO "+ tablename + " (";
  var valueSQL = " VALUES (";
  for (var key in obj) {
      var value = obj[key];
      if (value == null || value == undefined) continue;
      returnSQL += key + ",";
      
      if (typeof value == "string") {
        valueSQL += " '" + value + "'";
      }
      else {
        valueSQL += value;
      }
      valueSQL += ","
  }
  return returnSQL.substring(0,returnSQL.length-1) + ") " + valueSQL.substring(0,valueSQL.length-1) + ")";
}
function updateSqlFromObject(tablename,obj) {
  var returnSQL = "UPDATE "+ tablename + " SET ";
  for (var key in obj) {
      var value = obj[key];
      if (value == null || value == undefined) continue;
      if (key == "id") continue;
      if (key == "visibilityMap") continue;
      if (typeof value == "string") {
        returnSQL += key + "=" + " '" + value + "',";
      }
      else {
        returnSQL += key + "=" + value + ","
      }
  }
  return returnSQL.substring(0,returnSQL.length-1) + " WHERE id="+obj.id;
}
function sqlFromObject(obj) {
  var returnSQL = "";
  for (var key in obj) {
      var value = obj[key];
      if (typeof value == "string") {
        returnSQL += " '" + value + "'";
      }
      else {
        returnSQL += value;
      }
      returnSQL += ","
  }
  return returnSQL;
}

async function getRoomIdFromCode(roomCode) {
  var sql = "SELECT id from Room where code='"+roomCode+"';";
  if (DEBUG) console.log(sql);
  var rows = await query(sql);
  if (rows != null && rows.length > 0) {
    return rows[0].id;
  }
  return null;
}
async function checkIfRoomTaken(roomCode) {
  var ans = await getRoomIdFromCode(roomCode);
  return ans != null;
}

async function postRoom(roomCode) {
  var sql = insertSqlFromObject("Room",{isActive : 1, code : roomCode});
  if (DEBUG) console.log(sql);
  return await(insert(sql));
}
async function postNewPlayer(name,roomCode,classInput,isOwner=false,x=0,y=0) {
  var roomId = await getRoomIdFromCode(roomCode);
  var sql = insertSqlFromObject("Player",{name:name,room:roomId,playerClass:(classInput*1),bIsOwner:(isOwner) ? 1 : 0,x:x,y:y});
  if (DEBUG) console.log(sql);
  return await insert(sql);
}
async function updatePlayer(data) {
  var sql = updateSqlFromObject("Player",data);
  if (DEBUG) console.log(sql);
  return await insert(sql);
}
async function getPlayerFromNameAndCode(name,roomCode) {
  var id = await getRoomIdFromCode(roomCode);
  if (id == null) return null;
  var sql = "SELECT * from Player where name='"+name+"' AND room="+id+";";
  if (DEBUG) console.log(sql);
  var rows = await query(sql);
  if (rows != null && rows.length > 0) {
    return rows[0];
  }
  return null;
}

async function getAllPlayersInRoom(roomId) {
  var sql = "SELECT * from Player where room=" + roomId + ";";
  if (DEBUG) console.log(sql);
  var rows = await query(sql);
  if (rows != null && rows.length > 0) {
    for (var i =0; i < rows.length; i++) {
      var row = rows[i];
      row["visibilityMap"] = await getPlayerVisibilityMap(row.id);
    }
    return rows;
  }
  return [];
}

async function postNewPlayerVisibility(roomId, playerId) {
  var temp = await getAllPlayersInRoom(roomId);
  var success = true;
  for (var i = 0; i < temp.length; i++) {
    var tempPlayer = temp[i];
    if (tempPlayer.id != playerId) {
      var sql = "INSERT INTO Visibility (viewerId,playerId) VALUES ("+tempPlayer.id+","+playerId+")";
      if (DEBUG) console.log(sql);
      success = await insert(sql) && success;
      var sql = "INSERT INTO Visibility (viewerId,playerId) VALUES ("+playerId+","+tempPlayer.id+")";
      if (DEBUG) console.log(sql);
      success = await insert(sql) && success;
    }
  }
  return success;
}
async function updatePlayerVisibility(viewerId, playerId, visibility) {
  var sql = "UPDATE Visibility SET bIsVisible=" + visibility + " WHERE viewerId="+viewerId+" AND playerId="+playerId;
  if (DEBUG) console.log(sql);
  return await insert(sql);
}
async function updatePlayerVisibilityFromMap(viewerId, visMap) {
  success = true;
  for (var k in visMap) {
    success = success && await updatePlayerVisibility(viewerId,k,visMap[k]);
  }
  return success;
}
async function getPlayerVisibilityMap(viewerId) {
  var sql = "SELECT playerId, bIsVisible FROM Visibility WHERE viewerId="+viewerId;
  if (DEBUG) console.log(sql);
  var results = await query(sql);
  var ans = {};  
  for (var i = 0; i < results.length; i++) {
    ans[results[i].playerId] = results[i].bIsVisible;
  }
  return ans;
}
//#endregion
/** 
 * 
 * Handle Requests
 * 
 */

var users = {};
var rooms = {};

var tickRate = 10;

var userCount = 0;

http.listen(PORT, function(){
    console.log('listening on *:' + PORT);
  });
  io.on("connection",function(socket) {
      users[socket.id] = {};
      socket.on('disconnect',() => {
        if (DEBUG) console.log("DISCONNECTED : " + users[socket.id]);
        (async () => {
          if (users[socket.id] != null && users[socket.id].player != null) {
            try {
              await refreshRoomInstance(users[socket.id].player.room);
            }
            catch (e) {
              console.log("Error: Failed to save room on disconnect");
            }
          }
        })();
      });
      socket.on(EVENT_TYPES.create_room,(message) => {
        (async () => {
        if (DEBUG) console.log("RECIEVED : " + EVENT_TYPES.create_room + " : " + message);
        var roomCode = null;
        var playerName = null;
        var success = false;

        roomCode = (message != null && message.data != null) ? message.data.roomCode : null;
        nameInput = (message != null && message.data != null) ? message.data.nameInput : null;
        classInput = (message != null && message.data != null) ? message.data.classInput : -1;

        if (roomCode != null && nameInput != null) {
          var taken = await checkIfRoomTaken();
          if (!taken) {
            success = await postRoom(roomCode);
            success = success && await postNewPlayer(nameInput,roomCode,classInput,true);
            if (success) {
              users[socket.id].player = await getPlayerFromNameAndCode(nameInput,roomCode);
              await postNewPlayerVisibility(users[socket.id].player.room,users[socket.id].player.id);
              users[socket.id].player.visibilityMap = getPlayerVisibilityMap(users[socket.id].player.id);
              rooms[users[socket.id].player.room] = {players : []};
              rooms[users[socket.id].player.room].players.push( users[socket.id].player);
            }
          }
        }
        else {
          success = false;
        }
        socket.emit(EVENT_TYPES.create_room,{success:success,id: users[socket.id].player.id,isOwner:users[socket.id].player.bIsOwner, roomCode : roomCode});
      })();
      });
      socket.on(EVENT_TYPES.join_room, (message) => {
        if (DEBUG) console.log("RECIEVED : " + EVENT_TYPES.join_room + " : " + message);
        (async () => {
          var roomCode = null;
          var playerName = null;
          var classInput = null;
          var success = false;
          
          roomCode = (message != null && message.data != null) ? message.data.roomCode : null;
          nameInput = (message != null && message.data != null) ? message.data.nameInput : null;
          classInput = (message != null && message.data != null) ? message.data.classInput : -1;

          if (roomCode != null && nameInput != null) {
            var exists = await checkIfRoomTaken(roomCode);
            if (exists) {
              var playerObj = await getPlayerFromNameAndCode(nameInput,roomCode);
              if (playerObj != null) {
                success = true;
              }
              else {
                success = await postNewPlayer(nameInput,roomCode,classInput);
              }
              if (success) {
                if (playerObj == null) {
                  playerObj = await getPlayerFromNameAndCode(nameInput, roomCode);
                  success = await postNewPlayerVisibility(playerObj.room,playerObj.id);
                }
                playerObj.visibilityMap = getPlayerVisibilityMap(playerObj.id);
                users[socket.id].player = playerObj;
                refreshRoomInstance(playerObj.room);
              }
            }
          }
          else {
            success = false;
          }
          socket.emit(EVENT_TYPES.join_room,{success:success,id: users[socket.id].player.id, isOwner:users[socket.id].player.bIsOwner, roomCode:roomCode});
        })();
      });
      socket.on(EVENT_TYPES.room_update, (message) => {
        if (DEBUG) console.log("RECIEVED : " + EVENT_TYPES.room_update + " : " + message);
        (async () => {
          var roomId = users[socket.id].player.room;
          sendToRoom(roomId);
        })();
      }); 
      socket.on(EVENT_TYPES.update_visibility, (message) => {
        if (DEBUG) console.log("RECIEVED : " + EVENT_TYPES.update_visibility + " : " + message);
        (async () => {
          var roomId = users[socket.id].player.room;
          var player = users[socket.id].player;
          var target = message.data.playerId;
          var visMap = message.data.visibilityMap;
          if (player.bIsOwner) {
            success = setPlayerVisibility(roomId,target,visMap);
            if (success) sendToRoom(roomId);
          }
        })();
      });
      socket.on(EVENT_TYPES.ping_map, (message) => {
        if (DEBUG) console.log("RECIEVED : " + EVENT_TYPES.ping_map + " : " + message);
        console.log(message);
        (async () => {
          if (message != null && message.data != null && message.data.x != null && message.data.y != null) {
            var roomId = users[socket.id].player.room;
            sendPingToRoom(message.data.x,message.data.y,roomId)
          }
        })();
      }); 
      socket.on(EVENT_TYPES.move_player, (message) => {
        if (DEBUG) console.log("RECIEVED : " + EVENT_TYPES.move_player + " : " + message);
        var roomId = users[socket.id].player.room;
        (async () => {
          if (message != null && message.data != null) {
            var playerId = message.data.id;
            var playerX = message.data.x;
            var playerY = message.data.y;
            
            //If the player is not the owner of the room and is trying to move another player
            if (playerId != users[socket.id].player.id && !users[socket.id].player.bIsOwner) return;

            if (playerId && playerX && playerY) {
              movePlayerToSpot(users[socket.id].player.room,playerId,{x:playerX,y:playerY});
            }
          }
          sendToRoom(roomId);
        })();
      }); 
 });

 async function refreshRoomInstance(roomId) {
   if (rooms[roomId] != null) {
     //Save existing players
     var room = rooms[roomId];
     for (var i = 0; i < room.players.length;i++) {
        var player = room.players[i];
        await updatePlayer(player);
        await updatePlayerVisibilityFromMap(player.id,player.visibilityMap);
     }
     
   }
   else {
    rooms[roomId] = {};
    rooms[roomId].sockets = [];
   }
   rooms[roomId].players = await getAllPlayersInRoom(roomId);
 }
 
function movePlayerToSpot(roomId,playerId,spot) {
  if (rooms[roomId] != null) {
      var players = rooms[roomId].players;
      for (var i = 0; i < players.length; i++) {
        if (players[i].id == playerId) {
          players[i].x = spot.x;
          players[i].y = spot.y;
          return true;
        }
      }
    }
    return false;
 }
 function setPlayerVisibility(roomId,playerId,visMap) {
  if (rooms[roomId] != null) {
    var players = rooms[roomId].players;
    for (var i = 0; i < players.length; i++) {
      if (players[i].id == playerId) {
        players[i].visibilityMap = visMap;
        return true;
      }
    }
  }
  return false;
 }
 function sendToRoom(roomId) {
   var clients = io.sockets.clients().sockets;
   for (var socketKey in clients) {
     var mySocket = clients[socketKey];
     if (users[mySocket.id].player != null && users[mySocket.id].player.room == roomId) {
       mySocket.emit(EVENT_TYPES.room_update,rooms[roomId].players);
     }
   }
 }
 function sendPingToRoom(x,y,roomId) {
  var clients = io.sockets.clients().sockets;
  for (var socketKey in clients) {
    var mySocket = clients[socketKey];
    if (users[mySocket.id].player != null && users[mySocket.id].player.room == roomId) {
      mySocket.emit(EVENT_TYPES.ping_map,{x:x,y:y});
    }
  }
 }
