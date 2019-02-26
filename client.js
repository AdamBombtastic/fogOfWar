const EVENT_TYPES = {
    create_room : "create_room",
    join_room : "join_room",
    move_player : "move_player",
    room_update : "room_update",
    ping_map : "ping_map"
  }
  
var NetworkManager = {
    socket : null,
    observers : [],
    isConnected : false,
    connect : function() {
        this.socket = io();
        this.isConnected = true;
        this.socket.on(EVENT_TYPES.create_room,function(data) {
            console.log("Message from Server : " + EVENT_TYPES.create_room + " data :" + data);
            NetworkManager.broadcast(EVENT_TYPES.create_room,data);
        });
        this.socket.on(EVENT_TYPES.join_room,function(data) {
            console.log("Message from Server : " + EVENT_TYPES.join_room + " data :" + data);
            NetworkManager.broadcast(EVENT_TYPES.join_room,data);
        });
        this.socket.on(EVENT_TYPES.move_player, function(data) {
            console.log("Message from Server : " + EVENT_TYPES.move_player + " data :" + data);
            NetworkManager.broadcast(EVENT_TYPES.move_player,data);
        });
        this.socket.on(EVENT_TYPES.room_update, function(data) {
            console.log("Message from Server : " + EVENT_TYPES.room_update + " data :" + data);
            NetworkManager.broadcast(EVENT_TYPES.room_update,data);
        });
        this.socket.on(EVENT_TYPES.ping_map, function(data) {
            console.log("Message from Server : " + EVENT_TYPES.ping_map + " data :" + data);
            NetworkManager.broadcast(EVENT_TYPES.ping_map,data);
        });
    },
    broadcast : function(event,data) {
        for (var i = 0; i < this.observers.length; i++) {
            var obj = this.observers[i];
            obj.NetworkUpdate(event,data);
        }
    },
    addObserver : function(obj) {
        this.observers.push(obj);
    },
    clearObservers : function() {
        this.observers = [];
    },
    tryCreateRoom(data) {
        if (this.isConnected) {
            this.socket.emit(EVENT_TYPES.create_room,{data:data});
        }
    },
    tryJoinRoom(data) {
        if (this.isConnected) {
            this.socket.emit(EVENT_TYPES.join_room,{data:data});
        }
    },
    tryMovePlayer(data) {
        if (this.isConnected) {
            console.log(data);
            this.socket.emit(EVENT_TYPES.move_player,{data:data});
        }
    },
    tryUpdateRoom(data) {
        if (this.isConnected) {
            this.socket.emit(EVENT_TYPES.room_update,{data:data});
        }
    },
    tryPingMap(data) {
        if (this.isConnected) {
            //console.log(data);
            this.socket.emit(EVENT_TYPES.ping_map,{data:data});
        }
    }
}
