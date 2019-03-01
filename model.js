var Model = {
    map : {
        width: 0, 
        height : 0,
        scaleX : 1,
        savelY : 1,
        imageURL : "",
    },
    players : [],
    playerId : 0,
    isOwner : false,
    roomCode : "",
    getMyPlayer : () => {
        for (var i = 0; i < Model.players.length; i++) {
            var player = Model.players[i];
            if (player.id == Model.playerId) {
                return player;
            }
        }
        return {};
    },
    getPlayerWithId : (passedId) => {
        for (var i = 0; i < Model.players.length; i++) {
            var player = Model.players[i];
            if (player.id == passedId) {
                return player;
            }
        }
        return {};
    }
}


function BaseObject(data) {
    this.data = data;
    this.id = data.id;
    this._loadValues = function(data) {
        for (var k in data) {
            this.data[k] = data[k];
        }
    }
    this._baseProp = function(propName,val=null) {
        if (propName != null && val == null) { // GET
            if (this.data[propName] !== undefined) {
                return this.data[propName];
            }
        }
        else if (propName != null && val != null) { //SET
            if (this.data[propName] !== undefined) {
                this.data[propName] = val;
                return this.data[propName];
            }
        }
    }
    this._loadValues(data.data);
}
function PlayerObject(data) {
    BaseObject.call(this,data);
    this.Name  = function(val=null) {
        return this._baseProp("name",val);
    }
    this.X = function(val=null) {
        return this._baseProp("x",val);
    }
    this.Y = function(val=null) {
        return this._baseProp("y",val);
    }
    this.IsVisible = function(val=null) {
        return this._baseProp("isVisible",val);
    }
    this.Id = function(val=null) {
        return this._baseProp("id",val);
    }
    this.GameClass = function(val=null) {
        return this._baseProp("gameClass",val);
    }
}